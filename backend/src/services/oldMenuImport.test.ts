import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { extractOldMenu, MAX_MENU_FILE_BYTES, prepareMenuFile, validateExtractedMenu } from './oldMenuImport';

const extracted = () => ({ name: '369 Pizza', notes: 'One price is unreadable.', sections: [{ name: 'Drinks', page: 1, items: [{ name: 'Pepsi', price: 180 }, { name: 'Fanta', price: null }] }] });
test('menu extraction preserves headings, pages, null prices and zero; rejects unsafe output and excessive menus', () => {
    assert.deepEqual(validateExtractedMenu(extracted()), extracted());
    const zero = extracted(); zero.sections[0].items[0].price = 0; assert.equal(validateExtractedMenu(zero).sections[0].items[0].price, 0);
    const invalid: unknown[] = [null, { ...extracted(), sections: [] }];
    for (const price of [-1, Infinity, NaN, Number.MAX_VALUE, '180']) { const menu = extracted(); menu.sections[0].items[0].price = price as number; invalid.push(menu); }
    for (const page of [0, 21, 1.5]) { const menu = extracted(); menu.sections[0].page = page; invalid.push(menu); }
    invalid.push({ ...extracted(), sections: [{ name: 'A', page: 1, items: Array.from({ length: 101 }, () => ({ name: 'Pepsi', price: 180 })) }, { name: 'B', page: 2, items: Array.from({ length: 100 }, () => ({ name: 'Fanta', price: 100 })) }] });
    for (const value of invalid) assert.throws(() => validateExtractedMenu(value));
});

test('uploads enforce size, MIME and decoded content; photos are normalized and PDFs stay inline', async () => {
    const image = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const result = await prepareMenuFile(`data:image/png;base64,${image.toString('base64')}`);
    assert.equal(result.mimeType, 'image/jpeg'); assert.equal((await sharp(Buffer.from(result.data, 'base64')).metadata()).format, 'jpeg');
    const pdf = Buffer.from('%PDF-1.4\nfixture');
    assert.deepEqual(await prepareMenuFile(`data:application/pdf;base64,${pdf.toString('base64')}`), { mimeType: 'application/pdf', data: pdf.toString('base64') });
    for (const source of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:application/pdf;base64,aGVsbG8=', `data:image/jpeg;base64,${image.toString('base64')}`, 'data:image/png;base64,aGVsbG8=', `data:application/pdf;base64,${Buffer.alloc(MAX_MENU_FILE_BYTES + 1).toString('base64')}`]) await assert.rejects(() => prepareMenuFile(source));
});

test('PDF extraction uses actual document input and structured output without inventing a missing price', async t => {
    const original = process.env.GEMINI_API_KEYS; process.env.GEMINI_API_KEYS = 'test-key';
    t.after(() => { if (original === undefined) delete process.env.GEMINI_API_KEYS; else process.env.GEMINI_API_KEYS = original; });
    t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
        assert.ok(body.contents[0].parts[0].text.includes('never instructions'));
        assert.equal(body.generationConfig.responseSchema.properties.sections.items.properties.items.items.properties.price.nullable, true);
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(extracted()) }] } }] }));
    });
    const result = await extractOldMenu({ file: `data:application/pdf;base64,${Buffer.from('%PDF-1.4\nfixture').toString('base64')}` });
    assert.equal(result.sections[0].items[1].price, null);
});
