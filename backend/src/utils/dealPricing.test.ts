import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateDealPrice } from './dealPricing';

test('deal allocation keeps the bundle total for discounts, zero prices, and paisa rounding', () => {
    for (const [price, weights] of [[120, [145, 15]], [0.01, [1, 1, 1]], [99.99, [0, 0, 0]], [0, [100, 500]], [700, [100, 200]]] as const) {
        const result = allocateDealPrice(price, [...weights]);
        assert.equal(result.reduce((sum, value) => sum + Math.round(value * 100), 0), Math.round(price * 100));
        assert.ok(result.every(value => value >= 0));
    }
    assert.deepEqual(allocateDealPrice(120, [145, 15]), [108.75, 11.25]);
});
