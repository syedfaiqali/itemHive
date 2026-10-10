import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Compile only the pure menu modules in memory; no browser, database, or emitted files.
const cache = new Map();
function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    if (!['aiMenu', 'menuLayouts', 'menuContent', 'oldMenuImport'].includes(name)) throw new Error(`Unexpected module ${name}`);
    const module = { exports: {} }; cache.set(name, module);
    const source = readFileSync(new URL(`../src/pages/DigitalMenus/${name}.ts`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    new Function('require', 'module', 'exports', outputText)(id => load(id.replace('./', '')), module, module.exports);
    return module.exports;
}
const { applyAISections } = load('aiMenu');
const { createTemplatePage } = load('menuLayouts');
const { newMenuBlock } = load('menuContent');
const { buildImportedMenu, matchImportedItem, reviewImportedMenu, validateReviewedImport } = load('oldMenuImport');
const design = { templateId: 'midnight', accentColor: '#bb99ee', textColor: '#ffffff' };
const section = (name, productIds) => ({ name, productIds, reason: 'AI suggestion' });
const importProducts = [{ id: 'pepsi', name: 'Pepsi', salePrice: 200 }, { id: 'fanta', name: 'Fanta', salePrice: 120 }];
const oldMenu = { name: 'Old cafe', notes: '', sections: [{ name: 'Drinks', page: 1, items: [{ name: 'PEPSI', price: 180 }, { name: 'Fanta', price: 0 }] }] };

test('old menu import uses unique name matches and requires review of missing, ambiguous or duplicate inventory items', () => {
    assert.equal(matchImportedItem(' pepsi ', importProducts).id, 'pepsi');
    assert.equal(matchImportedItem('Pepsi', [...importProducts, { id: 'other', name: 'pepsi' }]), undefined);
    const sections = reviewImportedMenu(oldMenu, importProducts, {});
    assert.equal(sections[0].items[1].price, '0'); assert.equal(validateReviewedImport(sections, importProducts), undefined);
    sections[0].items[1].productId = 'pepsi'; assert.match(validateReviewedImport(sections, importProducts), /more than once/);
    sections[0].items[1].productId = ''; assert.match(validateReviewedImport(sections, importProducts), /Match every/);
    sections[0].items[1].selected = false; assert.equal(validateReviewedImport(sections, importProducts), undefined);
});

test('reviewed old prices replace only menu prices, and template section styles and original names survive import', () => {
    const sections = reviewImportedMenu(oldMenu, importProducts, {});
    const existing = { name: 'Current menu', content: createTemplatePage(design, 'Current menu', 1), pageCount: 1, productIds: ['pepsi'], productPrices: { pepsi: 200 } };
    const original = JSON.stringify(existing);
    const result = buildImportedMenu({ name: oldMenu.name, sections, mode: 'replace' }, design, existing, importProducts);
    assert.equal(result.name, 'Old cafe'); assert.deepEqual(result.productPrices, { pepsi: 180, fanta: 0 });
    const drinks = result.content.find(block => block.type === 'section'); assert.equal(drinks.text, 'Drinks'); assert.equal(drinks.span, 3);
    assert.deepEqual(drinks.productIds, ['pepsi', 'fanta']); assert.equal(JSON.stringify(existing), original); assert.equal(importProducts[0].salePrice, 200);
    const appended = buildImportedMenu({ name: oldMenu.name, sections, mode: 'append' }, design, existing, importProducts);
    assert.equal(appended.name, 'Current menu'); assert.equal(appended.pageCount, 2); assert.equal(appended.content.find(block => block.type === 'section' && block.productIds.length).page, 2);
});

test('large imported sections continue across pages; unreadable prices use visible inventory defaults; oversized imports are rejected atomically', () => {
    const products = Array.from({ length: 31 }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}`, salePrice: 10 }));
    const source = { name: 'Old', notes: '', sections: [{ name: 'Snacks', page: 1, items: products.map(item => ({ name: item.name, price: null })) }] };
    const sections = reviewImportedMenu(source, products, {}); assert.equal(sections[0].items[0].price, '10'); assert.equal(sections[0].items[0].priceMissing, true);
    const existing = { name: '', content: [], pageCount: 1, productIds: [], productPrices: {} };
    const result = buildImportedMenu({ name: 'Old', sections, mode: 'replace' }, design, existing, products);
    assert.equal(result.pageCount, 3); assert.equal(result.productIds.length, 31); assert.deepEqual(result.content.filter(block => block.type === 'section').map(block => block.productIds.length), [15, 15, 1]);
    sections[0].page = 20; assert.throws(() => buildImportedMenu({ name: 'Old', sections, mode: 'replace' }, design, existing, products), /20 pages/); assert.deepEqual(existing.content, []);
});

test('existing template sections retain placement and styles; items move without duplication or changing inventory prices', () => {
    const content = createTemplatePage(design, '369 Pizza', 1);
    const drinks = content.find(block => block.text === 'Drinks'); drinks.productIds = ['pepsi']; drinks.fontSize = 19; drinks.align = 'right';
    const pizzas = content.find(block => block.text === 'Pizzas'); pizzas.productIds = ['pizza', 'fanta'];
    const original = JSON.stringify(content);
    const result = applyAISections(content, ['pizza', 'pepsi', 'fanta'], { pepsi: 180 }, 1, [section('Drinks', ['fanta', 'pepsi'])], design, '369 Pizza');
    const updated = result.content.find(block => block.id === drinks.id);
    assert.equal(updated.fontSize, 19); assert.equal(updated.align, 'right'); assert.equal(updated.span, drinks.span);
    assert.deepEqual(updated.productIds, ['fanta', 'pepsi']);
    assert.deepEqual(result.content.find(block => block.id === pizzas.id).productIds, ['pizza']);
    assert.deepEqual(result.productPrices, { pepsi: 180 }); assert.equal(result.pageCount, 1);
    assert.equal(JSON.stringify(content), original);
});

test('large AI sections continue on template pages with headings and each item appears exactly once', () => {
    const items = Array.from({ length: 35 }, (_, i) => `drink-${i}`);
    const result = applyAISections(createTemplatePage(design, '369 Pizza', 1), [], {}, 1, [section('Drinks', items)], design, '369 Pizza');
    assert.equal(result.pageCount, 3);
    assert.deepEqual(result.content.filter(block => block.text === 'Drinks').map(block => block.productIds.length), [15, 15, 5]);
    assert.equal(result.content.filter(block => block.type === 'heading' || block.type === 'title').length, 3);
    const assigned = result.content.flatMap(block => block.productIds); assert.equal(new Set(assigned).size, 35);
    assert.deepEqual(result.productIds, items);
});

test('custom layouts get sections and limit failures leave the original draft untouched', () => {
    const custom = { ...design, templateId: 'custom' };
    const title = newMenuBlock('title', '#ffffff', 'Cafe');
    const result = applyAISections([title], [], {}, 1, [section('Coffee', ['coffee'])], custom, 'Cafe');
    assert.equal(result.content[0].id, title.id); assert.equal(result.content[1].text, 'Coffee');
    const full = [title, ...Array.from({ length: 99 }, () => newMenuBlock('label', '#fff', 'Note'))];
    const original = JSON.stringify(full);
    assert.throws(() => applyAISections(full, [], {}, 1, [section('Coffee', ['coffee'])], custom, 'Cafe'), /100-element/);
    assert.equal(JSON.stringify(full), original);
    assert.throws(() => applyAISections([title], [], {}, 1, [section('A', ['coffee']), section('B', ['coffee'])], custom, 'Cafe'), /only belong/);
});
