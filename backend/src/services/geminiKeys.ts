export function getGeminiKeys(): string[] {
    const configured = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    return [...new Set(configured.split(',').map(key => key.trim()).filter(Boolean))];
}

export class GeminiQuotaError extends Error {
    constructor() { super('All configured Gemini keys are currently quota limited'); }
}

export class GeminiRequestError extends Error {
    constructor(public readonly code: 'connection' | 'timeout' | 'model' | 'credentials' | 'provider') {
        super(`Gemini request failed: ${code}`);
    }
}

export async function fetchWithGeminiFallback(urls: string[], body: string): Promise<Response> {
    const keys = getGeminiKeys();
    if (!keys.length) throw new Error('Gemini is not configured');
    // One shared deadline keeps the entire chain within the frontend timeout.
    const signal = AbortSignal.timeout(45000);
    for (const key of keys) {
        let response: Response | undefined;
        // Google's "high demand" 5xx responses are per model, so each such retry moves to the next URL.
        let urlIndex = 0;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (signal.aborted) throw new GeminiRequestError('timeout');
            try {
                response = await fetch(urls[urlIndex % urls.length], {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    signal,
                    body,
                });
            } catch {
                if (signal.aborted) throw new GeminiRequestError('timeout');
                if (attempt === 2) throw new GeminiRequestError('connection');
                await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
                continue;
            }
            if (![500, 502, 503, 504].includes(response.status)) break;
            await response.body?.cancel();
            if (attempt === 2) throw new GeminiRequestError('provider');
            urlIndex++;
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
        if (!response) throw new GeminiRequestError('connection');
        if ([401, 403, 404].includes(response.status)) {
            await response.body?.cancel();
            throw new GeminiRequestError(response.status === 404 ? 'model' : 'credentials');
        }
        if (response.status !== 429) return response;
        // Release the rejected response before trying the next credential.
        await response.body?.cancel();
    }
    throw new GeminiQuotaError();
}
