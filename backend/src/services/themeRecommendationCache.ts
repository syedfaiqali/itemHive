import { createHash } from 'node:crypto';
import type { SuggestedPalette, ThemeRecommendation } from './logoTheme';

export class ThemeRequestBusyError extends Error {}

type Generate = (logo: string, mode: 'light' | 'dark', exclude: SuggestedPalette[]) => Promise<ThemeRecommendation[]>;

export function createThemeRecommendationCache(generate: Generate) {
    // Every finished request asks for fresh themes; only identical in-flight requests share work.
    const pending = new Map<string, { hash: string; promise: Promise<ThemeRecommendation[]> }>();
    return async (userId: string, logo: string, mode: 'light' | 'dark', exclude: SuggestedPalette[] = []) => {
        const hash = createHash('sha256').update(`${mode}\n${JSON.stringify(exclude)}\n`).update(logo).digest('hex');
        const active = pending.get(userId);
        if (active) {
            if (active.hash === hash) return active.promise;
            throw new ThemeRequestBusyError('Another logo is being analyzed');
        }
        const promise = Promise.resolve().then(() => generate(logo, mode, exclude));
        pending.set(userId, { hash, promise });
        try {
            return await promise;
        } finally {
            pending.delete(userId);
        }
    };
}
