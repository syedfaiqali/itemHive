import { test } from 'node:test';
import assert from 'node:assert/strict';
import Product from '../models/Product';
import { resolveSellingLine, validateSellingProduct, type SellingProduct } from './productSelling';

const sugar = (): SellingProduct => ({ name: 'Sugar', unitSizeEnabled: true, sellingType: 'quantity', productUnitCode: 'kg', productUnit: 'Kg', purchasePrice: 120, salePrice: 160, price: 160, stock: 50 });
const pepsi = (): SellingProduct => ({ name: 'Pepsi', unitSizeEnabled: true, sellingType: 'fixed', productUnitCode: 'litre', productUnit: 'Liter', purchasePrice: 0, salePrice: 0, stock: 0, sizes: [
    { id: 'small', size: 0.5, purchasePrice: 70, salePrice: 100, stock: 10 },
    { id: 'large', size: 1.5, purchasePrice: 150, salePrice: 200, stock: 6 },
] });

test('quantity products accept customer-entered fractions and bill per unit', () => {
    const product = sugar();
    const line = resolveSellingLine(product, 0.5);
    assert.equal(line.unitPrice * 0.5, 80);
    assert.equal(line.name, 'Sugar — 0.5 Kg');
    assert.equal(resolveSellingLine(product, 1.275).unitPrice * 1.275, 204);
    for (const invalid of [0, -1, NaN, Infinity, 50.1]) assert.throws(() => resolveSellingLine(product, invalid));
});

test('fixed sizes use pack prices and pack stock independently of size volume', () => {
    const product = pepsi();
    validateSellingProduct(product);
    assert.equal(product.stock, 16);
    const small = resolveSellingLine(product, 2, 'small');
    assert.equal(small.unitPrice * 2, 200);
    assert.equal(small.unitCost, 70);
    assert.equal(small.name, 'Pepsi — 0.5 Liter × 2');
    assert.equal(resolveSellingLine(product, 1, 'large').unitPrice, 200);
    assert.throws(() => resolveSellingLine(product, 7, 'large'), /Insufficient stock/);
    assert.throws(() => resolveSellingLine(product, 0.5, 'small'), /Invalid quantity/);
    assert.throws(() => resolveSellingLine(product, 1), /Invalid size/);
    assert.throws(() => resolveSellingLine(product, 1, 'missing'), /Invalid size/);
});

test('enabled products require a unit, selling type and complete unique sizes', () => {
    assert.throws(() => validateSellingProduct({ ...sugar(), productUnit: '' }), /Unit/);
    assert.throws(() => validateSellingProduct({ ...sugar(), sellingType: '' }), /Selling type/);
    assert.throws(() => validateSellingProduct({ ...sugar(), productUnitCode: 'other', productUnit: 'Other' }), /Unit/);
    assert.doesNotThrow(() => validateSellingProduct({ ...sugar(), productUnitCode: 'other', productUnit: 'Meter' }));
    assert.throws(() => validateSellingProduct({ ...pepsi(), sizes: [] }), /complete size/);
    const product = pepsi();
    product.sizes![1].size = 0.5;
    assert.throws(() => validateSellingProduct(product), /unique/);
    product.sizes![1].size = 1.5;
    product.sizes![1].stock = 1.2;
    assert.throws(() => validateSellingProduct(product), /whole pack stock/);
});

test('normal products retain whole item quantities and ordinary labels', () => {
    const product = { ...sugar(), unitSizeEnabled: false };
    assert.equal(resolveSellingLine(product, 2).name, 'Sugar');
    assert.throws(() => resolveSellingLine(product, 0.5), /Invalid quantity/);
    assert.throws(() => resolveSellingLine(product, 1, 'small'), /Invalid size/);
    assert.doesNotThrow(() => validateSellingProduct({ ...product, productUnit: '', sellingType: '' }));
});

test('product schema validates enabled products and recalculates aggregate pack stock', async () => {
    const base = { id: 'test', sku: 'TEST', category: 'General', minStock: 0 };
    const product = new Product({ ...base, ...pepsi() });
    await product.validate();
    assert.equal(product.stock, 16);
    product.sizes![0].stock -= 2;
    await product.validate();
    assert.equal(product.stock, 14);
    assert.equal(product.sizes![1].stock, 6);
    await assert.rejects(new Product({ ...base, ...sugar(), sellingType: '' }).validate(), /Selling type/);
    await assert.rejects(new Product({ ...base, ...sugar(), productUnit: undefined, productUnitCode: undefined }).validate(), /Unit/);
    await assert.rejects(new Product({ ...base, ...pepsi(), sizes: [] }).validate(), /complete size/);
    const measured = new Product({ ...base, ...sugar(), stock: 0.3 - 0.1 });
    await measured.validate();
    assert.equal(measured.stock, 0.2);
    assert.doesNotThrow(() => resolveSellingLine(measured, 0.2));
});
