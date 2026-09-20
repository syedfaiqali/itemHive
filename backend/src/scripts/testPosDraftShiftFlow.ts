import assert from 'node:assert/strict';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from '../models/Business';
import User from '../models/User';
import Product from '../models/Product';
import AppSetting from '../models/AppSetting';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const API_URL = process.env.POS_TEST_API_URL || 'http://127.0.0.1:5050/api';
const createdBusinessIds: mongoose.Types.ObjectId[] = [];
const createdUserIds: mongoose.Types.ObjectId[] = [];

const nearlyEqual = (actual: unknown, expected: number, label: string) => {
    const numeric = Number(actual);
    assert.ok(Number.isFinite(numeric), `${label}: expected a number, received ${String(actual)}`);
    assert.ok(Math.abs(numeric - expected) < 0.001, `${label}: expected ${expected}, received ${numeric}`);
};

type ApiOptions = {
    method?: string;
    body?: unknown;
    expectedStatus?: number;
    businessId: string;
    token: string;
};

const api = async (path: string, options: ApiOptions) => {
    const response = await fetch(`${API_URL}${path}`, {
        method: options.method || 'GET',
        headers: {
            Authorization: `Bearer ${options.token}`,
            'Content-Type': 'application/json',
            'x-itemhive-workspace-id': options.businessId,
        },
        body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    const expectedStatus = options.expectedStatus ?? 200;
    assert.equal(
        response.status,
        expectedStatus,
        `${options.method || 'GET'} ${path}: expected ${expectedStatus}, received ${response.status}: ${text}`,
    );
    return payload;
};

const cleanup = async () => {
    if (mongoose.connection.readyState === 0 || createdBusinessIds.length === 0) return;
    const businessFilter = { businessId: { $in: createdBusinessIds } };
    const collections = ['creditpayments', 'installmentplans', 'transactions', 'orderdrafts', 'posshifts', 'products', 'appsettings'];
    for (const collectionName of collections) {
        const existing = mongoose.connection.collections[collectionName];
        if (existing) await existing.deleteMany(businessFilter);
    }
    if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
    await Business.deleteMany({ _id: { $in: createdBusinessIds } });

    for (const collectionName of collections) {
        const existing = mongoose.connection.collections[collectionName];
        if (existing) assert.equal(await existing.countDocuments(businessFilter), 0, `${collectionName} cleanup failed`);
    }
    assert.equal(await User.countDocuments({ _id: { $in: createdUserIds } }), 0, 'user cleanup failed');
    assert.equal(await Business.countDocuments({ _id: { $in: createdBusinessIds } }), 0, 'business cleanup failed');
};

const run = async () => {
    const mongoUri = process.env.MONGODB_URI;
    assert.ok(mongoUri, 'MONGODB_URI is required');
    await mongoose.connect(mongoUri);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const businessA = await Business.create({ name: `Codex POS Test A ${suffix}`, slug: `codex-pos-a-${suffix}` });
    const businessB = await Business.create({ name: `Codex POS Test B ${suffix}`, slug: `codex-pos-b-${suffix}` });
    createdBusinessIds.push(businessA._id, businessB._id);

    const user = await User.create({
        name: 'Codex POS Tester',
        email: `codex-pos-${suffix}@example.test`,
        password: 'Temporary-Test-Password-123!',
        role: 'super_admin',
        businessId: businessA._id,
        installmentAccess: true,
        discountAccess: true,
        screenPermissions: null,
    });
    createdUserIds.push(user._id);
    const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    const authA = { businessId: String(businessA._id), token };
    const authB = { businessId: String(businessB._id), token };

    await Product.create([
        {
            id: `P-A-${suffix}`,
            sku: `SKU-A-${suffix}`,
            name: 'Test Zinger',
            category: 'Test Food',
            purchasePrice: 60,
            salePrice: 100,
            price: 100,
            stock: 20,
            minStock: 2,
            businessId: businessA._id,
            businessName: businessA.name,
        },
        {
            id: `P-B-${suffix}`,
            sku: `SKU-B-${suffix}`,
            name: 'Test Cold Drink',
            category: 'Test Food',
            purchasePrice: 20,
            salePrice: 50,
            price: 50,
            stock: 10,
            minStock: 2,
            businessId: businessA._id,
            businessName: businessA.name,
        },
    ]);
    await AppSetting.create({
        key: `business:${businessA._id}`,
        businessId: businessA._id,
        salesTaxRate: 10,
        discountsEnabled: true,
        discountOptions: [5],
        restaurantEnabled: true,
        installmentsEnabled: true,
    });

    const permissions = await api('/users/admin-permissions', { ...authA });
    assert.ok(permissions, 'admin-permissions route returned an empty response');

    const initialShift = await api('/pos-shifts/current', { ...authA });
    assert.equal(initialShift.shift, null, 'test tenant should start without an open shift');
    const opened = await api('/pos-shifts/open', {
        ...authA,
        method: 'POST',
        body: { openingCash: 1000, registerName: 'Test Counter' },
        expectedStatus: 201,
    });
    const shiftId = String(opened.shift._id);
    await api('/pos-shifts/open', {
        ...authA,
        method: 'POST',
        body: { openingCash: 0, registerName: 'Second Counter' },
        expectedStatus: 409,
    });
    assert.equal((await api('/pos-shifts/current', { ...authB })).shift, null, 'another tenant must not see the open shift');

    const productAId = `P-A-${suffix}`;
    const productBId = `P-B-${suffix}`;
    const draft = await api('/order-drafts', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: {
            items: [
                { productId: productAId, quantity: 1, unitPrice: 100 },
                { productId: productBId, quantity: 1, unitPrice: 50 },
            ],
            discountPercent: 5,
            orderType: 'Dine In',
        },
    });
    assert.equal(await Product.findOne({ id: productAId, businessId: businessA._id }).then((p) => p?.stock), 20, 'saving a draft must not reduce stock');
    assert.equal((await api('/order-drafts', { ...authA })).length, 1, 'draft list should contain the saved order');
    assert.equal((await api('/order-drafts', { ...authB })).length, 0, 'another tenant must not see the draft');
    const invalidDiscountDraft = await api('/order-drafts', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: { items: [{ productId: productAId, quantity: 1, unitPrice: 100 }], discountPercent: 50 },
    });
    assert.equal(invalidDiscountDraft.discountPercent, 0, 'draft must not preserve an unconfigured discount');
    await api(`/order-drafts/${invalidDiscountDraft._id}`, { ...authA, method: 'DELETE' });
    const updatedDraft = await api(`/order-drafts/${draft._id}`, {
        ...authA,
        method: 'PUT',
        body: { items: [{ productId: productAId, quantity: 2, unitPrice: 100 }], discountPercent: 5, orderType: 'Takeaway' },
    });
    assert.equal(updatedDraft.items[0].quantity, 2, 'draft update should preserve edited quantity');
    assert.equal((await api(`/order-drafts/${draft._id}`, { ...authA })).orderType, 'Takeaway', 'draft detail should return edited order type');

    const cashOrderId = `R-CASH-${suffix}`;
    const cashCheckout = await api('/transactions/checkout', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: {
            orderId: cashOrderId,
            shiftId,
            items: [
                { productId: productAId, quantity: 2, unitPrice: 100 },
                { productId: productBId, quantity: 1, unitPrice: 50 },
            ],
            discountPercent: 5,
            paymentMethod: 'cash',
            orderType: 'Dine In',
        },
    });
    assert.equal(cashCheckout.transactions.length, 2, 'multi-line checkout should create two transaction lines');
    assert.equal(await Product.findOne({ id: productAId, businessId: businessA._id }).then((p) => p?.stock), 18, 'cash checkout should reduce product A stock');
    assert.equal(await Product.findOne({ id: productBId, businessId: businessA._id }).then((p) => p?.stock), 9, 'cash checkout should reduce product B stock');
    await api('/transactions/checkout', {
        ...authA,
        method: 'POST',
        body: {
            orderId: cashOrderId,
            shiftId,
            items: [{ productId: productAId, quantity: 2, unitPrice: 100 }],
            discountPercent: 5,
            paymentMethod: 'cash',
        },
    });
    assert.equal(await Product.findOne({ id: productAId, businessId: businessA._id }).then((p) => p?.stock), 18, 'retrying an order must not reduce stock twice');

    let xReport = (await api('/pos-shifts/x-report', { ...authA })).report.totals;
    assert.equal(xReport.completedOrders, 1);
    assert.equal(xReport.itemsSold, 3);
    nearlyEqual(xReport.grossSales, 250, 'cash report gross sales');
    nearlyEqual(xReport.discounts, 12.5, 'cash report discounts');
    nearlyEqual(xReport.tax, 25, 'cash report tax');
    nearlyEqual(xReport.netSales, 262.5, 'cash report net sales');
    nearlyEqual(xReport.cashSales, 262.5, 'cash report cash sales');
    nearlyEqual(xReport.expectedDrawerCash, 1262.5, 'cash report expected drawer');

    await api('/transactions/checkout', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: {
            orderId: `R-CREDIT-${suffix}`,
            shiftId,
            items: [{ productId: productAId, quantity: 1, unitPrice: 100 }],
            discountPercent: 5,
            paymentMethod: 'credit',
            paidNow: 40,
            paidVia: 'cash',
            customerName: 'Test Customer',
            customerCnic: '42101-1234567-1',
            orderType: 'Takeaway',
        },
    });
    xReport = (await api('/pos-shifts/x-report', { ...authA })).report.totals;
    assert.equal(xReport.completedOrders, 2);
    assert.equal(xReport.itemsSold, 4);
    nearlyEqual(xReport.creditSales, 105, 'credit sale total');
    nearlyEqual(xReport.creditCashReceived, 40, 'credit paid at sale');
    nearlyEqual(xReport.expectedDrawerCash, 1302.5, 'drawer after credit deposit');

    await api('/credits/payments', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: { customerName: 'Test Customer', customerCnic: '42101-1234567-1', amount: 20, paidVia: 'cash', notes: 'test collection' },
    });
    xReport = (await api('/pos-shifts/x-report', { ...authA })).report.totals;
    nearlyEqual(xReport.creditCollectionsCash, 20, 'credit collection cash');
    nearlyEqual(xReport.expectedDrawerCash, 1322.5, 'drawer after credit collection');

    const installment = await api('/installments', {
        ...authA,
        method: 'POST',
        expectedStatus: 201,
        body: {
            planCode: `INS-${suffix}`,
            productId: productBId,
            productName: 'Test Cold Drink',
            amount: 1,
            totalAmount: 50,
            unitPrice: 50,
            advancePayment: 10,
            advancePaidVia: 'card',
            customerName: 'Installment Customer',
            customerCnic: '42101-7654321-9',
            customerPhone: '03001234567',
            customerAddress: 'Test Address Karachi',
            saleDate: new Date().toISOString(),
            installmentMonths: 3,
            userName: 'Codex POS Tester',
            orderType: 'dine_in',
            shiftId,
            orderId: `R-INSTALLMENT-${suffix}`,
            witnesses: [
                { name: 'Witness One', cnic: '42101-1111111-1', address: 'Witness Address One' },
                { name: 'Witness Two', cnic: '42101-2222222-2', address: 'Witness Address Two' },
            ],
        },
    });
    xReport = (await api('/pos-shifts/x-report', { ...authA })).report.totals;
    assert.equal(xReport.completedOrders, 3);
    assert.equal(xReport.itemsSold, 5);
    nearlyEqual(xReport.grossSales, 400, 'all-sales gross total');
    nearlyEqual(xReport.netSales, 417.5, 'all-sales net total');
    nearlyEqual(xReport.installmentSales, 50, 'installment sales');
    nearlyEqual(xReport.installmentCardAdvance, 10, 'installment card advance');
    nearlyEqual(xReport.expectedDrawerCash, 1322.5, 'card advance must not increase drawer cash');

    const firstInstallment = installment.schedule[0];
    const paidPlan = await api(`/installments/${installment.planCode}/payments`, {
        ...authA,
        method: 'POST',
        body: { installmentNumber: firstInstallment.installmentNumber, paidVia: 'cash', notes: 'test EMI collection' },
    });
    assert.equal(paidPlan.schedule[0].status, 'paid', 'installment payment should mark schedule entry paid');
    xReport = (await api('/pos-shifts/x-report', { ...authA })).report.totals;
    nearlyEqual(xReport.installmentCollectionsCash, 13.33, 'installment collection cash');
    nearlyEqual(xReport.expectedDrawerCash, 1335.83, 'drawer after installment collection');

    await api(`/order-drafts/${draft._id}`, { ...authA, method: 'DELETE' });
    await api(`/order-drafts/${draft._id}`, { ...authA, expectedStatus: 404 });

    const closed = await api('/pos-shifts/close', {
        ...authA,
        method: 'POST',
        body: { countedCash: 1330 },
    });
    assert.equal(closed.report.status, 'closed');
    nearlyEqual(closed.report.totals.expectedDrawerCash, 1335.83, 'Z report expected drawer');
    nearlyEqual(closed.report.totals.cashDifference, -5.83, 'Z report cash difference');
    assert.equal((await api('/pos-shifts/current', { ...authA })).shift, null, 'closed shift must no longer be current');
    await api('/pos-shifts/x-report', { ...authA, expectedStatus: 404 });
    await api('/pos-shifts/close', { ...authA, method: 'POST', body: { countedCash: 0 }, expectedStatus: 400 });
    const history = await api('/pos-shifts/history', { ...authA });
    assert.equal(history.total, 1, 'closing report history should contain the closed test shift');
    assert.equal(history.items.length, 1, 'closing report history page should contain the closed test shift');
    nearlyEqual(history.items[0].finalReport.totals.netSales, 417.5, 'stored closing report snapshot net sales');

    const firstClosedTransactionId = cashCheckout.transactions[0].id;
    await api(`/transactions/${firstClosedTransactionId}`, { ...authA, method: 'DELETE', expectedStatus: 409 });
    assert.equal(await Product.findOne({ id: productAId, businessId: businessA._id }).then((p) => p?.stock), 17, 'closed Z transaction deletion must not restore stock');
    assert.equal((await api('/transactions', { ...authB })).length, 0, 'another tenant must not see test transactions');

    console.log('PASS admin-permissions route');
    console.log('PASS isolated shift open and duplicate-open guard');
    console.log('PASS draft create, edit, list, delete, stock safety, tenant isolation');
    console.log('PASS atomic multi-line checkout and idempotent retry');
    console.log('PASS cash, credit, credit collection, installment and EMI X totals');
    console.log('PASS Z close snapshot, cash difference, history and closed-transaction lock');
};

run()
    .then(async () => {
        await cleanup();
        console.log('PASS isolated test data cleanup');
        await mongoose.disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        try {
            await cleanup();
            console.error('Cleanup completed after failure');
        } finally {
            await mongoose.disconnect();
        }
        process.exitCode = 1;
    });
