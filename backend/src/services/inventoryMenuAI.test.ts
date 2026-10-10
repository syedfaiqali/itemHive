import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestInventoryMenu, validateMenuSuggestion } from './inventoryMenuAI';

const inventory = [{ id: 'pizza', name: 'Pizza', category: 'Food', price: 500 }, { id: 'drink', name: 'Pepsi', category: 'Drinks', price: 100 }];
const suggestion = () => ({ summary: 'Food and drinks.', sections: [{ name: 'Pizzas', reason: 'Main dishes', productIds: ['pizza'] }, { name: 'Drinks', reason: 'Refreshing sides', productIds: ['drink'] }], deals: [{ name: 'Pizza + Pepsi', reason: 'Lunch combo', productIds: ['pizza', 'drink'], dealPrice: 550.556 }] });

test('AI combos validate inventory, calculate regular price, round edited currency and honor the disabled checkbox', () => {
    assert.deepEqual(validateMenuSuggestion(suggestion(), inventory, true).deals[0], { ...suggestion().deals[0], dealPrice: 550.56, regularPrice: 600 });
    assert.deepEqual(validateMenuSuggestion(suggestion(), inventory, false).deals, []);
    assert.equal(inventory[0].price, 500);
});

test('untrusted AI cannot invent products, double-assign products or offer invalid combos/prices', () => {
    const invalid: unknown[] = [null, { ...suggestion(), sections: [{ name: 'Fake', reason: 'bad', productIds: ['foreign'] }] }];
    const duplicate = suggestion(); duplicate.sections[1].productIds = ['pizza']; invalid.push(duplicate);
    const duplicateNames = suggestion(); duplicateNames.sections[1].name = 'pizzas'; invalid.push(duplicateNames);
    const duplicateIngredient = suggestion(); duplicateIngredient.deals[0].productIds = ['pizza', 'pizza']; invalid.push(duplicateIngredient);
    const foreign = suggestion(); foreign.deals[0].productIds = ['pizza', 'foreign']; invalid.push(foreign);
    const omitted = suggestion(); omitted.sections.pop(); invalid.push(omitted);
    const repeated = suggestion(); repeated.deals.push({ ...repeated.deals[0] }); invalid.push(repeated);
    for (const price of [-1, 601, NaN, Infinity, Number.MAX_VALUE, '550']) { const result = suggestion(); result.deals[0].dealPrice = price as number; invalid.push(result); }
    for (const input of invalid) assert.throws(() => validateMenuSuggestion(input, inventory, true));
});

test('provider receives a structured inventory request and results use validated IDs, without writing inventory', async t => {
    const original = process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEYS = 'test-key';
    t.after(() => { if (original === undefined) delete process.env.GEMINI_API_KEYS; else process.env.GEMINI_API_KEYS = original; });
    t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        assert.ok(body.contents[0].parts[0].text.includes(JSON.stringify(inventory)));
        assert.ok(body.contents[0].parts[0].text.includes('Deals are disabled'));
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(suggestion()) }] } }] }));
    });
    const result = await suggestInventoryMenu(inventory, { menuName: '369 Pizza', brief: 'Takeaway', includeDeals: false, existingSections: ['Pizzas'] });
    assert.equal(result.sections[0].productIds[0], 'pizza');
    assert.deepEqual(result.deals, []);
});

test('malformed or empty provider responses never become fake menu suggestions', async t => {
    const original = process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEYS = 'test-key';
    t.after(() => { if (original === undefined) delete process.env.GEMINI_API_KEYS; else process.env.GEMINI_API_KEYS = original; });
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ candidates: [] })));
    await assert.rejects(() => suggestInventoryMenu(inventory, { menuName: '', brief: '', includeDeals: true, existingSections: [] }));
});
