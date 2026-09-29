import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithGeminiFallback, GeminiQuotaError, GeminiRequestError, getGeminiKeys } from './geminiKeys';

test('ordered quota fallback, exhaustion, and non-quota failures', async () => {
    const originalFetch = global.fetch;
    const previous = process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEYS = ' first,second,third,fourth,fifth,first ';
    const seen: string[] = [];
    const signals: unknown[] = [];
    try {
        assert.equal(getGeminiKeys().length, 5);
        global.fetch = async (_url, options) => {
            seen.push((options!.headers as Record<string, string>)['x-goog-api-key']);
            signals.push(options!.signal);
            assert.equal(options!.body, 'same request');
            return new Response('{}', { status: seen.length < 3 ? 429 : 200 });
        };
        assert.equal((await fetchWithGeminiFallback(['https://example.test'], 'same request')).status, 200);
        assert.deepEqual(seen, ['first', 'second', 'third']);
        assert.ok(signals.every(signal => signal === signals[0]));

        let calls = 0;
        global.fetch = async () => { calls++; return new Response('', { status: 429 }); };
        await assert.rejects(fetchWithGeminiFallback(['https://example.test'], '{}'), GeminiQuotaError);
        assert.equal(calls, 5);

        for (const status of [400, 401, 403, 404]) {
            calls = 0;
            global.fetch = async () => { calls++; return new Response('', { status }); };
            if ([401, 403, 404].includes(status)) await assert.rejects(fetchWithGeminiFallback(['https://example.test'], '{}'), GeminiRequestError);
            else assert.equal((await fetchWithGeminiFallback(['https://example.test'], '{}')).status, status);
            assert.equal(calls, 1);
        }

        calls = 0;
        global.fetch = async () => { calls++; return new Response('', { status: calls < 3 ? 503 : 200 }); };
        assert.equal((await fetchWithGeminiFallback(['https://example.test'], '{}')).status, 200);
        assert.equal(calls, 3);

        calls = 0;
        global.fetch = async () => { calls++; if (calls < 3) throw new TypeError('fetch failed'); return new Response('{}'); };
        assert.equal((await fetchWithGeminiFallback(['https://example.test'], '{}')).status, 200);
        assert.equal(calls, 3);

        calls = 0;
        global.fetch = async () => { calls++; return new Response('', { status: 503 }); };
        await assert.rejects(fetchWithGeminiFallback(['https://example.test'], '{}'), (error: unknown) => error instanceof GeminiRequestError && error.code === 'provider');
        assert.equal(calls, 3);
    } finally {
        global.fetch = originalFetch;
        if (previous === undefined) delete process.env.GEMINI_API_KEYS;
        else process.env.GEMINI_API_KEYS = previous;
    }
});

test('provider failures move to the next model while connection retries keep the model', async () => {
    const originalFetch = global.fetch;
    const previous = process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEYS = 'only';
    const models = ['https://primary.test', 'https://fallback.test'];
    const seen: string[] = [];
    try {
        global.fetch = async url => { seen.push(String(url)); return new Response('{}', { status: seen.length < 2 ? 503 : 200 }); };
        assert.equal((await fetchWithGeminiFallback(models, '{}')).status, 200);
        assert.deepEqual(seen, ['https://primary.test', 'https://fallback.test']);

        seen.length = 0;
        global.fetch = async url => { seen.push(String(url)); return new Response('', { status: 503 }); };
        await assert.rejects(fetchWithGeminiFallback(models, '{}'), (error: unknown) => error instanceof GeminiRequestError && error.code === 'provider');
        assert.deepEqual(seen, ['https://primary.test', 'https://fallback.test', 'https://primary.test']);

        seen.length = 0;
        global.fetch = async url => { seen.push(String(url)); if (seen.length < 2) throw new TypeError('fetch failed'); return new Response('{}'); };
        assert.equal((await fetchWithGeminiFallback(models, '{}')).status, 200);
        assert.deepEqual(seen, ['https://primary.test', 'https://primary.test']);
    } finally {
        global.fetch = originalFetch;
        if (previous === undefined) delete process.env.GEMINI_API_KEYS;
        else process.env.GEMINI_API_KEYS = previous;
    }
});
