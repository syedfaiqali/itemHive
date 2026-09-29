import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeKeys, validateRecommendation, validateRecommendations, contrast, recommendLogoThemes, getThemeModels } from './logoTheme';

function sample() {
    return { name: 'Brand theme', explanation: 'Inspired by the logo.', colors: Object.fromEntries(themeKeys.map(key => [key, '#ffffff'])) };
}

test('requires all theme colors and rejects invalid or extra model output', () => {
    const missing = sample();
    delete missing.colors.navbarFontColor;
    assert.throws(() => validateRecommendation(missing));
    assert.throws(() => validateRecommendation({ ...sample(), colors: { ...sample().colors, borderColor: 'red' } }));
    assert.throws(() => validateRecommendation({ ...sample(), logo: 'unexpected' }));
});

test('repairs low-contrast text for all five text/background pairs', () => {
    const { colors } = validateRecommendation(sample());
    for (const [text, background] of [['fontColor', 'backgroundColor'], ['headingColor', 'backgroundColor'], ['secondaryTextColor', 'backgroundColor'], ['sidebarFontColor', 'sidebarColor'], ['navbarFontColor', 'navbarColor']] as const) {
        assert.ok(contrast(colors[text], colors[background]) >= 4.5);
    }
});

test('orders the configured model before deduplicated fallbacks', () => {
    const previous = { model: process.env.GEMINI_THEME_MODEL, fallbacks: process.env.GEMINI_THEME_FALLBACK_MODELS };
    try {
        delete process.env.GEMINI_THEME_MODEL;
        delete process.env.GEMINI_THEME_FALLBACK_MODELS;
        assert.deepEqual(getThemeModels(), ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-lite-latest']);
        process.env.GEMINI_THEME_MODEL = 'primary';
        process.env.GEMINI_THEME_FALLBACK_MODELS = ' backup, primary,,backup ';
        assert.deepEqual(getThemeModels(), ['primary', 'backup']);
        process.env.GEMINI_THEME_FALLBACK_MODELS = '';
        assert.deepEqual(getThemeModels(), ['primary']);
    } finally {
        for (const [name, value] of [['GEMINI_THEME_MODEL', previous.model], ['GEMINI_THEME_FALLBACK_MODELS', previous.fallbacks]] as const) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }
});

test('requires at least three complete themes', () => {
    assert.equal(validateRecommendations({ themes: [sample(), sample(), sample()] }).length, 3);
    assert.throws(() => validateRecommendations({ themes: [sample(), sample()] }));
    assert.throws(() => validateRecommendations({ themes: [sample(), sample(), { ...sample(), colors: {} }] }));
    assert.throws(() => validateRecommendations(sample()));
});

test('sends logo and previous palettes to provider and validates the returned themes', async () => {
    const previousKeys = process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEYS = 'test-key';
    const original = global.fetch;
    const reply = (themes: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ themes }) }] } }] }));
    const previous = { themeColor: '#f59e0b', secondaryColor: '#d97706', backgroundColor: '#f8fafc', sidebarColor: '#ffffff', navbarColor: '#ffffff' };
    let prompt = '';
    global.fetch = async (_url, options) => {
        const body = JSON.parse(options!.body as string);
        prompt = body.contents[0].parts[0].text;
        assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/png');
        const themes = body.generationConfig.responseSchema.properties.themes;
        assert.equal(themes.minItems, 3);
        assert.equal(themes.items.properties.colors.required.length, 14);
        return reply([sample(), sample(), sample()]);
    };
    try {
        const themes = await recommendLogoThemes('data:image/png;base64,aGVsbG8=', 'light');
        assert.deepEqual(themes.map(theme => theme.name), ['Brand theme', 'Brand theme', 'Brand theme']);
        assert.ok(!prompt.includes('already suggested'));
        await recommendLogoThemes('data:image/png;base64,aGVsbG8=', 'light', [previous]);
        assert.ok(prompt.includes('already suggested') && prompt.includes('accent #f59e0b'));
        await assert.rejects(recommendLogoThemes('https://example.com/logo.png', 'light'));
        global.fetch = async () => reply([sample()]);
        await assert.rejects(recommendLogoThemes('data:image/png;base64,aGVsbG8=', 'light'));
        global.fetch = async () => new Response('', { status: 429 });
        await assert.rejects(recommendLogoThemes('data:image/png;base64,aGVsbG8=', 'dark'));
        global.fetch = async () => new Response(JSON.stringify({ candidates: [] }));
        await assert.rejects(recommendLogoThemes('data:image/png;base64,aGVsbG8=', 'light'));
    } finally {
        global.fetch = original;
        if (previousKeys === undefined) delete process.env.GEMINI_API_KEYS;
        else process.env.GEMINI_API_KEYS = previousKeys;
    }
});
