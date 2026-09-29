import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createThemeRecommendationCache, ThemeRequestBusyError } from './themeRecommendationCache';
import type { SuggestedPalette, ThemeRecommendation } from './logoTheme';

const result = [{ name: 'Theme', explanation: 'Example', colors: {} }] as ThemeRecommendation[];
const previous = { themeColor: '#f59e0b', secondaryColor: '#d97706', backgroundColor: '#f8fafc', sidebarColor: '#ffffff', navbarColor: '#ffffff' } as SuggestedPalette;

test('failed requests can retry immediately', async () => {
    let calls = 0;
    const get = createThemeRecommendationCache(async () => {
        if (++calls === 1) throw new Error('Provider failed');
        return result;
    });
    await assert.rejects(get('user', 'logo', 'light'));
    assert.equal(await get('user', 'logo', 'light'), result);
    assert.equal(calls, 2);
});

test('identical in-flight requests share work; finished requests generate fresh themes', async () => {
    let calls = 0;
    const seenExclude: SuggestedPalette[][] = [];
    let finish!: (value: ThemeRecommendation[]) => void;
    const get = createThemeRecommendationCache(async (_logo, _mode, exclude) => {
        calls++;
        seenExclude.push(exclude);
        return new Promise<ThemeRecommendation[]>(resolve => { finish = resolve; });
    });
    const first = get('user', 'logo', 'light');
    const duplicate = get('user', 'logo', 'light');
    await assert.rejects(get('user', 'other-logo', 'light'), ThemeRequestBusyError);
    await assert.rejects(get('user', 'logo', 'light', [previous]), ThemeRequestBusyError);
    await Promise.resolve();
    finish(result);
    assert.deepEqual(await Promise.all([first, duplicate]), [result, result]);
    assert.equal(calls, 1);

    for (const [user, logo, mode, exclude] of [['user', 'logo', 'light', []], ['user', 'logo', 'light', [previous]], ['other-user', 'other-logo', 'dark', []]] as const) {
        const request = get(user, logo, mode, [...exclude]);
        await Promise.resolve();
        finish(result);
        await request;
    }
    assert.equal(calls, 4);
    assert.deepEqual(seenExclude[2], [previous]);
});
