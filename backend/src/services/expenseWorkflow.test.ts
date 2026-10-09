import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import expenseRoutes from '../routes/expenseRoutes';
import posShiftRoutes from '../routes/posShiftRoutes';
import Expense from '../models/Expense';
import POSShift from '../models/POSShift';
import Business from '../models/Business';
import User from '../models/User';
import { PayrollPolicy } from '../models/Payroll';

test('expense API, tenant isolation and POS drawer accounting', { timeout: 240000 }, async t => {
  const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || '../.cache/mongodb-binaries' } });
  await mongoose.connect(replica.getUri(), { dbName: 'itemhive_expense_test_' + randomUUID().replaceAll('-', '') });
  const app = express(); app.use(express.json({ limit: '3mb' })); app.use('/expenses', expenseRoutes); app.use('/pos-shifts', posShiftRoutes);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
  try {
    await Expense.createIndexes(); await POSShift.createIndexes();
    const business = await Business.create({ name: 'Expense test', slug: randomUUID() });
    const foreign = await Business.create({ name: 'Foreign expense test', slug: randomUUID() });
    const staff = await User.create({ name: 'Staff', email: randomUUID() + '@example.test', role: 'user', businessId: business._id });
    const reviewer = await User.create({ name: 'Reviewer', email: randomUUID() + '@example.test', role: 'admin', businessId: business._id, screenPermissions: ['finance_view', 'finance_expense_approve', 'finance_pay', 'pos'] });
    const legacy = await User.create({ name: 'Legacy Admin', email: randomUUID() + '@example.test', role: 'admin', businessId: business._id, screenPermissions: null });
    const outsider = await User.create({ name: 'Other Admin', email: randomUUID() + '@example.test', role: 'admin', businessId: foreign._id, screenPermissions: ['finance_view', 'finance_expense_approve', 'finance_pay'] });
    await PayrollPolicy.create({ businessId: business._id, currency: 'PKR', timeZone: 'Asia/Karachi', confirmed: true });
    const request = async (user: any, method: string, path: string, body?: unknown) => {
      const r = await fetch(base + path, { method, headers: { Authorization: 'Bearer ' + jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET || 'secret'), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, data: await r.json() as any };
    };
    const draft = { title: 'Shop supplies', category: 'Supplies', dateKey: '2026-10-07', currency: 'PKR', amount: 100, key: randomUUID() };
    let e: any;
    await t.test('create is idempotent and scoped to creator and tenant', async () => {
      const created = await request(staff, 'POST', '/expenses', draft); assert.equal(created.status, 201); e = created.data;
      assert.equal((await request(staff, 'POST', '/expenses', draft)).data._id, e._id);
      assert.equal((await request(staff, 'POST', '/expenses', { ...draft, amount: 101 })).status, 409);
      assert.equal((await request(outsider, 'GET', '/expenses/' + e._id)).status, 404);
      assert.equal((await request(outsider, 'GET', '/expenses')).data.total, 0);
      assert.equal((await request(staff, 'GET', '/expenses?search=%5B')).status, 200);
    });
    await t.test('users and legacy admins cannot approve or pay; reviewer cannot self approve', async () => {
      const self = (await request(reviewer, 'POST', '/expenses', { ...draft, key: randomUUID() })).data;
      await request(reviewer, 'POST', '/expenses/' + self._id + '/decision', { version: 0, action: 'submit' });
      assert.equal((await request(reviewer, 'POST', '/expenses/' + self._id + '/decision', { version: 1, action: 'approve', reason: 'Checked' })).status, 409);
      e = (await request(staff, 'POST', '/expenses/' + e._id + '/decision', { version: e.version, action: 'submit' })).data;
      for (const user of [staff, legacy]) assert.equal((await request(user, 'POST', '/expenses/' + e._id + '/decision', { version: e.version, action: 'approve', reason: 'Checked' })).status, 403);
      e = (await request(reviewer, 'POST', '/expenses/' + e._id + '/decision', { version: e.version, action: 'approve', reason: 'Receipt checked' })).data;
      assert.equal(e.status, 'approved');
      assert.equal((await request(staff, 'PUT', '/expenses/' + e._id, { ...draft, version: e.version })).status, 409);
      assert.equal((await request(staff, 'POST', '/expenses/' + e._id + '/payments', { version: e.version, key: randomUUID(), amount: 1, method: 'cash', dateKey: '2026-10-07', reference: 'cash' })).status, 403);
    });
    const pay = (amount: number, method = 'cash', paymentKey = randomUUID(), v = e.version) => ({ amount, method, key: paymentKey, version: v, dateKey: '2026-10-07', reference: 'PAY-1' });
    await t.test('partial payments, retries and overpayment guards', async () => {
      const payment = pay(40); const paid = await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', payment); assert.equal(paid.status, 200); e = paid.data;
      assert.equal(e.paidMinor, 4000); assert.equal(e.outstandingMinor, 6000);
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', payment)).data.payments.length, 1);
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', { ...payment, amount: 41 })).status, 409);
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(61))).status, 400);
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(60, 'pos_drawer'))).status, 409);
    });
    await t.test('concurrent payments cannot spend the balance twice', async () => {
      const results = await Promise.all([request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(60)), request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(60))]);
      assert.equal(results.filter(r => r.status === 200).length, 1);
      e = (await request(reviewer, 'GET', '/expenses/' + e._id)).data; assert.equal(e.paidMinor, 10000);
      const reversal = { version: e.version, reason: 'Payment returned' };
      e = (await request(reviewer, 'POST', '/expenses/' + e._id + '/payments/' + e.payments[1]._id + '/reverse', reversal)).data; assert.equal(e.outstandingMinor, 6000);
    });
    await t.test('POS paid-outs, frozen closing reports and later refunds reconcile', async () => {
      const opened = await request(reviewer, 'POST', '/pos-shifts/open', { openingCash: 200, registerName: 'Test drawer' }); assert.equal(opened.status, 201);
      const wrongCurrency = await Expense.findByIdAndUpdate(e._id, { currency: 'USD' }, { new: true });
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(60, 'pos_drawer'))).status, 409);
      await Expense.updateOne({ _id: wrongCurrency!._id }, { $set: { currency: 'PKR' } });
      e = (await request(reviewer, 'POST', '/expenses/' + e._id + '/payments', pay(60, 'pos_drawer'))).data;
      const report = await request(reviewer, 'GET', '/pos-shifts/x-report'); assert.equal(report.status, 200); assert.equal(report.data.report.totals.expensePaidOut, 60); assert.equal(report.data.report.totals.expectedDrawerCash, 140);
      const closed = await request(reviewer, 'POST', '/pos-shifts/close', { countedCash: 140 }); assert.equal(closed.status, 200);
      const closedId = opened.data.shift._id;
      assert.equal((await request(reviewer, 'POST', '/expenses/' + e._id + '/payments/' + e.payments[2]._id + '/reverse', { version: e.version, reason: 'Refund' })).status, 409);
      await request(reviewer, 'POST', '/pos-shifts/open', { openingCash: 50, registerName: 'Next drawer' });
      e = (await request(reviewer, 'POST', '/expenses/' + e._id + '/payments/' + e.payments[2]._id + '/reverse', { version: e.version, reason: 'Refund' })).data;
      const next = await request(reviewer, 'GET', '/pos-shifts/x-report'); assert.equal(next.status, 200); assert.equal(next.data.report.totals.expenseRefunds, 60); assert.equal(next.data.report.totals.expectedDrawerCash, 110);
      const frozen = await POSShift.findById(closedId); assert.equal(frozen!.finalReport!.totals.expectedDrawerCash, 140); assert.equal(frozen!.finalReport!.totals.expenseRefunds, 0);
      const totals = (await request(reviewer, 'GET', '/expenses?status=approved')).data.totals[0]; assert.equal(totals.approvedMinor, 10000); assert.equal(totals.paidMinor, 4000); assert.equal(totals.outstandingMinor, 6000);
      const repeated = await request(reviewer, 'POST', '/expenses/' + e._id + '/payments/' + e.payments[2]._id + '/reverse', { version: 0, reason: 'Retry' }); assert.equal(repeated.data.payments.length, 3);
    });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await mongoose.disconnect(); await replica.stop(); }
});
