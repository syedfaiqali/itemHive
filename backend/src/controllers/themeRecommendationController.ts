import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { recommendLogoThemes } from '../services/logoTheme';
import { getGeminiKeys, GeminiQuotaError, GeminiRequestError } from '../services/geminiKeys';
import { createThemeRecommendationCache, ThemeRequestBusyError } from '../services/themeRecommendationCache';

const getRecommendations = createThemeRecommendationCache(recommendLogoThemes);
export async function recommendTheme(req: AuthRequest, res: Response) {
    if (!getGeminiKeys().length) return res.status(503).json({ message: 'AI theme recommendations are not configured yet. Ask your administrator to enable them.' });
    const userId = req.user!.id;
    try {
        return res.json({ themes: await getRecommendations(userId, req.body.logo, req.body.mode, req.body.exclude) });
    } catch (error) {
        if (error instanceof GeminiRequestError) {
            const messages = {
                connection: 'The server could not connect to Google AI. Please retry in a moment.',
                timeout: 'Google AI took too long to respond. Please retry.',
                model: 'The configured AI model is unavailable. Please ask your administrator to update it.',
                credentials: 'Google AI rejected the configured credentials. Please ask your administrator to check them.',
                provider: 'Google AI is experiencing high demand or a temporary service failure. Automatic retries did not succeed. Please try again shortly.',
            };
            return res.status(error.code === 'timeout' ? 504 : 503).json({ message: messages[error.code], code: error.code });
        }
        if (error instanceof ThemeRequestBusyError) return res.status(409).json({ message: 'Your previous logo is still being analyzed. Please retry when it finishes.' });
        if (error instanceof GeminiQuotaError) return res.status(503).json({ message: 'All AI keys have reached their current quota. Please try again later. Your colors have not changed.' });
        return res.status(502).json({ message: 'AI could not recommend a theme right now. Your colors have not changed. Please try again.' });
    }
}
