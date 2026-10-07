import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { randomUUID } from "crypto";
import {
  payrollRouter,
  myPayrollRouter,
  salespersonRouter,
} from "../routes/payrollRoutes";
import employeeRoutes from "../routes/employeeRoutes";
import attendanceRoutes from "../routes/attendanceRoutes";
import authRoutes from "../routes/authRoutes";
import settingsRoutes from "../routes/settingsRoutes";
import userRoutes from "../routes/userRoutes";
import transactionRoutes from "../routes/transactionRoutes";
import expenseRoutes from "../routes/expenseRoutes";
import posShiftRoutes from "../routes/posShiftRoutes";
import Product from "../models/Product";
import Transaction from "../models/Transaction";
import POSShift from "../models/POSShift";
import AppSetting from "../models/AppSetting";
import cors from "cors";
import Business from "../models/Business";
import User from "../models/User";
import Employee from "../models/Employee";
import Attendance from "../models/Attendance";
import {
  payrollModels,
  PayrollCommission,
  PayrollDayClaim,
  PayrollLoanMovement,
  PayrollPayment,
  PayrollRun,
} from "../models/Payroll";
import { dateKeys } from "./payrollCalculator";
import { recordCommission, reverseCommission } from "./payrollService";

test(
  "payroll API workflow in an isolated disposable database",
  { timeout: 1200000 },
  async (t) => {
    const database = `itemhive_payroll_test_${randomUUID().replaceAll("-", "")}`;
    assert.match(database, /^itemhive_payroll_test_[a-f0-9]{32}$/);
    const replica = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: {
        downloadDir:
          process.env.MONGOMS_DOWNLOAD_DIR || "../.cache/mongodb-binaries",
      },
    });
    const uri = replica.getUri();
    await mongoose.connect(uri, {
      dbName: database,
      serverSelectionTimeoutMS: 15000,
    });
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/users", userRoutes);
    app.get("/health", (_req, res) =>
      res.json({
        status: "healthy",
        database: "Connected",
        mode: "disposable payroll preview",
      }),
    );
    app.use("/api/payroll", payrollRouter);
    app.use("/api/me/payroll", myPayrollRouter);
    app.use("/api/salespeople", salespersonRouter);
    app.use("/api/employees", employeeRoutes);
    app.use("/api/attendance", attendanceRoutes);
    app.use("/api/transactions", transactionRoutes);
    app.use("/api/expenses", expenseRoutes);
    app.use("/api/pos-shifts", posShiftRoutes);
    const server = app.listen(
      process.env.PAYROLL_PREVIEW === "1" ? 5051 : 0,
      "127.0.0.1",
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}/api`;
    try {
      await Promise.all(payrollModels.map((m) => m.createIndexes()));
      await Employee.createIndexes();
      await Promise.all([
        Product.createIndexes(),
        Transaction.createIndexes(),
        POSShift.createIndexes(),
      ]);
      const business = await Business.create({
        name: "Payroll Test",
        slug: randomUUID(),
        isActive: true,
      });
      const foreign = await Business.create({
        name: "Other Tenant",
        slug: randomUUID(),
        isActive: true,
      });
      const permissions = [
        "finance_view", "finance_expense_approve", "finance_pay",
        "payroll_view",
        "payroll_prepare",
        "payroll_approve",
        "payroll_pay",
        "payroll_hr",
        "payroll_settings",
        "payroll_reports",
        "employees",
        "attendance",
        "pos",
        "orders",
        "transactions",
      ];
      const preparer = await User.create({
        name: "Preparer",
        email: "preparer@payroll.example.com",
        password: "PayrollTest!234",
        role: "admin",
        businessId: business._id,
        screenPermissions: permissions,
      });
      const approver = await User.create({
        name: "Approver",
        email: "approver@payroll.example.com",
        password: "PayrollTest!234",
        role: "admin",
        businessId: business._id,
        screenPermissions: permissions,
      });
      const denied = await User.create({
        name: "Unassigned Admin",
        email: `${randomUUID()}@example.test`,
        role: "admin",
        businessId: business._id,
        screenPermissions: null,
      });
      const staff = await User.create({
        name: "Staff",
        email: "staff@payroll.example.com",
        password: "PayrollTest!234",
        role: "user",
        businessId: business._id,
      });
      const employee = await Employee.create({
        employeeCode: "EMP-TEST",
        fullName: "Payroll Employee",
        joiningDate: "2026-09-01",
        salary: 3000,
        salaryType: "monthly",
        businessId: business._id,
        userId: staff._id,
      });
      const otherEmployee = await Employee.create({
        employeeCode: "EMP-OTHER",
        fullName: "Foreign Employee",
        joiningDate: "2026-09-01",
        businessId: foreign._id,
      });
      const token = (u: any) =>
        jwt.sign({ id: String(u._id) }, process.env.JWT_SECRET || "secret");
      const request = async (
        u: any,
        method: string,
        url: string,
        body?: unknown,
      ) => {
        const response = await fetch(base + url, {
          method,
          headers: {
            Authorization: `Bearer ${token(u)}`,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return {
          status: response.status,
          data: (await response.json()) as any,
        };
      };
      await t.test(
        "legacy full-access admins do not inherit payroll permissions; users cannot manage payroll",
        async () => {
          assert.equal(
            (await request(denied, "GET", "/payroll/runs")).status,
            403,
          );
          assert.equal(
            (await request(staff, "GET", "/payroll/runs")).status,
            403,
          );
        },
      );
      await t.test("business setup and migration are idempotent", async () => {
        const settings = (await request(preparer, "GET", "/payroll/settings"))
          .data;
        assert.equal(
          (
            await request(preparer, "PUT", "/payroll/settings", {
              ...settings,
              currency: "USD",
              enabled: true,
              confirmed: true,
              commissionsEnabled: true,
              reason: "Test setup",
            })
          ).status,
          200,
        );
        assert.equal(
          (await request(preparer, "POST", "/payroll/migration")).data.migrated,
          1,
        );
        assert.equal(
          (await request(preparer, "POST", "/payroll/migration")).data.migrated,
          0,
        );
        assert.equal(
          (
            await request(
              preparer,
              "PUT",
              `/payroll/employees/${employee._id}`,
              {
                payrollEnrolled: true,
                department: "Sales",
                employmentEndDate: "",
                paymentMethod: "bank",
                bankName: "Test Bank",
                bankAccount: "1234567890",
                reason: "Enroll",
              },
            )
          ).status,
          200,
        );
      });
      await t.test(
        "personal payroll uses business currency before the first payslip",
        async () => {
          const personal = await request(staff, "GET", "/me/payroll");
          assert.equal(personal.status, 200);
          assert.equal(personal.data.currency, "USD");
          assert.deepEqual(personal.data.payslips, []);
        },
      );
      await t.test(
        "cross-business employee references are rejected and salesperson lookup is slim",
        async () => {
          assert.equal(
            (
              await request(
                preparer,
                "GET",
                `/payroll/employees/${otherEmployee._id}`,
              )
            ).status,
            400,
          );
          const lookup = (await request(staff, "GET", "/salespeople")).data;
          assert.equal(lookup.defaultEmployeeId, String(employee._id));
          assert.equal(lookup.employees.length, 1);
          assert.ok(!("salary" in lookup.employees[0]));
        },
      );
      await t.test(
        "personal requests ignore forged employee identity and unpaid leave approval does not need entitlement",
        async () => {
          const r = await request(staff, "POST", "/me/payroll/requests", {
            employeeId: String(otherEmployee._id),
            kind: "leave",
            data: {
              startDate: "2026-09-01",
              endDate: "2026-09-01",
              leaveType: "unpaid",
              fraction: 1,
            },
            reason: "Unpaid test",
          });
          assert.equal(r.status, 201);
          assert.equal(String(r.data.employeeId), String(employee._id));
          assert.equal(
            (
              await request(
                approver,
                "POST",
                `/payroll/requests/${r.data._id}/decision`,
                { status: "approved", reason: "Approved" },
              )
            ).status,
            200,
          );
        },
      );
      await t.test(
        "loan approval and disbursement are distinct; retry does not duplicate money",
        async () => {
          const r = (
            await request(staff, "POST", "/me/payroll/requests", {
              kind: "loan",
              data: { amount: 1000, installment: 100, startMonth: "2026-09" },
              reason: "Test loan",
            })
          ).data;
          assert.equal(
            (
              await request(
                approver,
                "POST",
                `/payroll/requests/${r._id}/decision`,
                { status: "approved", reason: "Approved loan" },
              )
            ).status,
            200,
          );
          const loan = (await request(preparer, "GET", "/payroll/loans")).data
            .loans[0];
          assert.equal(loan.balanceMinor, 0);
          const body = {
            kind: "disbursement",
            key: "loan-disburse",
            reference: "TEST-LOAN",
            reason: "Cash disbursement",
          };
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/loans/${loan._id}/movements`,
                body,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/loans/${loan._id}/movements`,
                body,
              )
            ).status,
            200,
          );
          assert.equal(
            await PayrollLoanMovement.countDocuments({ kind: "disbursement" }),
            1,
          );
        },
      );
      // Approved unpaid day has no attendance. All other dates contain complete punches.
      await Attendance.insertMany(
        dateKeys("2026-09-02", "2026-09-30").map((dateKey) => ({
          businessId: business._id,
          employeeId: employee._id,
          dateKey,
          checkIn: `${dateKey}T04:00:00Z`,
          checkOut: `${dateKey}T12:00:00Z`,
          timeZone: "Asia/Karachi",
        })),
      );
      let run: any;
      await t.test(
        "calculate and submit payroll; own approval and stale versions are rejected",
        async () => {
          const created = await request(preparer, "POST", "/payroll/runs", {
            month: "2026-09",
            kind: "regular",
            employeeIds: [String(employee._id)],
            reason: "September payroll",
          });
          assert.equal(created.status, 201);
          run = created.data;
          const calc = await request(
            preparer,
            "POST",
            `/payroll/runs/${run._id}/calculate`,
            { version: run.version, reason: "Calculate" },
          );
          assert.equal(calc.status, 200);
          run = calc.data;
          assert.deepEqual(run.items[0].exceptions, []);
          const submitted = await request(
            preparer,
            "POST",
            `/payroll/runs/${run._id}/submit`,
            { version: run.version, reason: "Submit" },
          );
          assert.equal(submitted.status, 200);
          run = submitted.data;
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/runs/${run._id}/approve`,
                { version: run.version, reason: "Self approval" },
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                approver,
                "POST",
                `/payroll/runs/${run._id}/approve`,
                { version: 0, reason: "Stale" },
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "independent approval releases immutable snapshot and posts recoveries once",
        async () => {
          const approved = await request(
            approver,
            "POST",
            `/payroll/runs/${run._id}/approve`,
            { version: run.version, reason: "Independent approval" },
          );
          assert.equal(approved.status, 200);
          run = approved.data;
          assert.equal(
            await PayrollLoanMovement.countDocuments({ kind: "recovery" }),
            1,
          );
          assert.equal(await PayrollDayClaim.countDocuments(), 30);
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/runs/${run._id}/calculate`,
                { version: run.version, reason: "Mutate approved" },
              )
            ).status,
            400,
          );
          assert.equal(
            (await request(preparer, "DELETE", `/employees/${employee._id}`))
              .status,
            409,
          );
          assert.equal(
            (
              await request(preparer, "PUT", "/attendance/records", {
                employeeId: String(employee._id),
                dateKey: "2026-09-02",
                checkIn: "2026-09-02T04:00Z",
                checkOut: "2026-09-02T13:00Z",
                timeZone: "Asia/Karachi",
              })
            ).status,
            409,
          );
        },
      );
      await t.test(
        "payment retries, partial payment, reversal and overpayment protection reconcile",
        async () => {
          const payment = {
            runId: run._id,
            employeeId: String(employee._id),
            amount: 500,
            dateKey: "2026-10-01",
            method: "bank",
            reference: "TEST-PAY",
            key: "payment-1",
          };
          const first = await request(preparer, "POST", "/payroll/payments", {
            payments: [payment],
            reason: "Partial payment",
          });
          assert.equal(first.status, 200);
          assert.equal(
            (
              await request(preparer, "POST", "/payroll/payments", {
                payments: [payment],
                reason: "Retry",
              })
            ).status,
            200,
          );
          assert.equal(await PayrollPayment.countDocuments(), 1);
          assert.equal(
            (
              await request(preparer, "POST", "/payroll/payments", {
                payments: [{ ...payment, amount: 999999, key: "overpay" }],
                reason: "Overpay",
              })
            ).status,
            400,
          );
          const personal = (await request(staff, "GET", "/me/payroll")).data;
          assert.equal(personal.payslips.length, 1);
          assert.equal(personal.currency, "USD");
          assert.equal(personal.payslips[0].currency, "USD");
          assert.equal(personal.payslips[0].paidMinor, 50000);
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/payments/${first.data[0]._id}/reverse`,
                { reason: "Bank rejected" },
              )
            ).status,
            200,
          );
          assert.equal(
            (await request(staff, "GET", "/me/payroll")).data.payslips[0]
              .paidMinor,
            0,
          );
        },
      );
      await t.test(
        "unposted/posted commissions reverse correctly without changing approved payslip",
        async () => {
          const salary = (
            await request(preparer, "GET", `/payroll/employees/${employee._id}`)
          ).data.structures[0];
          // Commission rate version after approved September, avoiding changes to historical salary.
          assert.equal(
            (
              await request(
                preparer,
                "POST",
                `/payroll/employees/${employee._id}/structures`,
                {
                  effectiveDate: "2026-10-01",
                  base: 3000,
                  salaryType: "monthly",
                  commissionPercent: 5,
                  schedule: salary.schedule,
                  components: [],
                  reason: "Commission starts",
                },
              )
            ).status,
            201,
          );
          const sale = {
            businessId: business._id,
            salespersonEmployeeId: employee._id,
            type: "reduction",
            source: "pos",
            timestamp: new Date("2026-10-02T00:00Z"),
            id: "commission-sale",
            subtotal: 100,
            discountAmount: 10,
          };
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(() =>
              recordCommission(sale, session),
            );
          } finally {
            await session.endSession();
          }
          const c = await PayrollCommission.findOne({
            key: "sale:commission-sale",
          });
          assert.equal(c!.amountMinor, 450);
          c!.runId = run._id;
          await c!.save();
          const reverseSession = await mongoose.startSession();
          try {
            await reverseSession.withTransaction(() =>
              reverseCommission(sale, reverseSession),
            );
          } finally {
            await reverseSession.endSession();
          }
          assert.equal(
            (await PayrollCommission.findOne({
              key: "reversal:commission-sale",
            }))!.amountMinor,
            -450,
          );
          assert.equal(
            (await PayrollRun.findById(run._id))!.items[0].netMinor,
            run.items[0].netMinor,
          );
        },
      );
      await t.test(
        "POS commissions exclude tax, include credit sales and survive last-unit retries without duplicate stock or earnings",
        async () => {
          await AppSetting.findOneAndUpdate(
            { businessId: business._id },
            {
              $set: {
                discountsEnabled: true,
                discountOptions: [10],
                salesTaxRate: 20,
                restaurantEnabled: false,
              },
            },
            { upsert: true },
          );
          const product = await Product.create({
            businessId: business._id,
            id: "payroll-product",
            sku: "PAY-1",
            name: "Payroll test product",
            category: "Test",
            purchasePrice: 40,
            salePrice: 100,
            price: 100,
            stock: 1,
            minStock: 0,
          });
          const shift = await POSShift.create({
            businessId: business._id,
            shiftCode: "PAY-QA",
            registerName: "Test",
            openingCash: 0,
            status: "open",
            openedBy: staff._id,
            openedByName: "Staff",
          });
          const body = {
            orderId: "payroll-pos-credit",
            shiftId: String(shift._id),
            items: [{ productId: product.id, quantity: 1 }],
            discountPercent: 10,
            paymentMethod: "credit",
            paidNow: 0,
            customerName: "Test buyer",
            customerCnic: "TEST",
          };
          const first = await request(
            staff,
            "POST",
            "/transactions/checkout",
            body,
          );
          assert.equal(first.status, 201, JSON.stringify(first.data));
          const sale = first.data.transactions[0];
          assert.equal(sale.salespersonEmployeeId, String(employee._id));
          assert.equal(sale.taxAmount, 20);
          assert.equal(sale.discountAmount, 10);
          const commission = await PayrollCommission.findOne({
            businessId: business._id,
            key: `sale:${sale.id}`,
          });
          assert.equal(commission!.eligibleMinor, 9000);
          assert.equal(commission!.amountMinor, 450);
          const retry = await request(
            staff,
            "POST",
            "/transactions/checkout",
            body,
          );
          assert.equal(retry.status, 200, JSON.stringify(retry.data));
          assert.equal((await Product.findById(product._id))!.stock, 0);
          assert.equal(
            await PayrollCommission.countDocuments({
              businessId: business._id,
              saleId: sale.id,
            }),
            1,
          );
          assert.equal(
            await Transaction.countDocuments({
              businessId: business._id,
              orderId: body.orderId,
            }),
            1,
          );
          const deleted = await request(
            preparer,
            "DELETE",
            `/transactions/${sale.id}`,
          );
          assert.equal(deleted.status, 200, JSON.stringify(deleted.data));
          assert.equal((await Product.findById(product._id))!.stock, 1);
          assert.equal(
            (await PayrollCommission.findById(commission!._id))!.reversed,
            true,
          );
        },
      );
      await t.test(
        "reports and personal payslips reconcile; unrelated employee data remains absent",
        async () => {
          const report = await request(
            preparer,
            "GET",
            "/payroll/reports?from=2026-09&to=2026-09",
          );
          assert.equal(report.status, 200);
          assert.equal(report.data.rows.length, 1);
          assert.equal(report.data.rows[0].netMinor, run.items[0].netMinor);
          const personal = await request(staff, "GET", "/me/payroll");
          assert.equal(
            personal.data.payslips[0].employeeId,
            String(employee._id),
          );
        },
      );
      if (process.env.PAYROLL_PREVIEW === "1") {
        console.log(
          "Disposable payroll preview ready at http://127.0.0.1:5051. Test logins: preparer@payroll.example.com / approver@payroll.example.com / staff@payroll.example.com; password PayrollTest!234",
        );
        await new Promise<void>((resolve) =>
          app.post("/__preview/close", (_req, res) => {
            res.json({ closed: true });
            resolve();
          }),
        );
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      // Only the UUID-named database created by this test may be dropped.
      assert.equal(mongoose.connection.name, database);
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      await replica.stop();
    }
  },
);
