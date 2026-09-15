import { Response } from 'express';
import mongoose, { ClientSession } from 'mongoose';
import POSShift, { type IPOSShift, type IShiftReportSnapshot, type IShiftReportTotals } from '../models/POSShift';
import Transaction from '../models/Transaction';
import CreditPayment from '../models/CreditPayment';
import InstallmentPlan from '../models/InstallmentPlan';
import type { AuthRequest } from '../middleware/auth';
import { buildTenantFilter, getTenantObjectId } from '../utils/tenancy';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const buildShiftReport = async (
    req: AuthRequest,
    shift: IPOSShift,
    reportTime: Date,
    status: 'open' | 'closed',
    countedCash?: number,
    session?: ClientSession,
): Promise<IShiftReportSnapshot> => {
    const [transactions, creditCollections, installmentPlans] = await Promise.all([
        Transaction.find({
            ...buildTenantFilter(req.user!),
            shiftId: shift._id,
            source: 'pos',
            type: 'reduction',
        }).session(session || null).lean(),
        CreditPayment.find({ ...buildTenantFilter(req.user!), shiftId: shift._id }).session(session || null).lean(),
        InstallmentPlan.find({ ...buildTenantFilter(req.user!), 'schedule.shiftId': shift._id }).session(session || null).lean(),
    ]);
    const installmentCollections = installmentPlans.flatMap((plan) =>
        (plan.schedule || []).filter((item) => item.status === 'paid' && String(item.shiftId || '') === String(shift._id))
    );

    const totals: IShiftReportTotals = {
        completedOrders: new Set(transactions.map((transaction) => transaction.orderId || transaction.id)).size,
        itemsSold: transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
        grossSales: round2(transactions.reduce((sum, transaction) => {
            const lineSubtotal = transaction.subtotal != null
                ? Number(transaction.subtotal)
                : transaction.unitPrice != null
                    ? Number(transaction.unitPrice) * Number(transaction.amount || 0)
                    : Number(transaction.totalPrice || 0);
            return sum + lineSubtotal;
        }, 0)),
        discounts: round2(transactions.reduce((sum, transaction) => sum + Number(transaction.discountAmount || 0), 0)),
        tax: round2(transactions.reduce((sum, transaction) => sum + Number(transaction.taxAmount || 0), 0)),
        netSales: round2(transactions.reduce((sum, transaction) => sum + Number(transaction.totalPrice || 0), 0)),
        cashSales: round2(transactions.filter((transaction) => transaction.paymentMethod === 'cash').reduce((sum, transaction) => sum + Number(transaction.totalPrice || 0), 0)),
        cardSales: round2(transactions.filter((transaction) => transaction.paymentMethod === 'card').reduce((sum, transaction) => sum + Number(transaction.totalPrice || 0), 0)),
        creditSales: round2(transactions.filter((transaction) => transaction.paymentMethod === 'credit').reduce((sum, transaction) => sum + Number(transaction.totalPrice || 0), 0)),
        creditCashReceived: round2(transactions.filter((transaction) => transaction.paymentMethod === 'credit' && transaction.paidVia === 'cash').reduce((sum, transaction) => sum + Number(transaction.paidNow || 0), 0)),
        creditCardReceived: round2(transactions.filter((transaction) => transaction.paymentMethod === 'credit' && transaction.paidVia === 'card').reduce((sum, transaction) => sum + Number(transaction.paidNow || 0), 0)),
        creditCollectionsCash: round2(creditCollections.filter((payment) => payment.paidVia === 'cash').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
        creditCollectionsCard: round2(creditCollections.filter((payment) => payment.paidVia === 'card').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
        installmentSales: round2(transactions.filter((transaction) => transaction.paymentMethod === 'installment').reduce((sum, transaction) => sum + Number(transaction.totalPrice || 0), 0)),
        installmentCashAdvance: round2(transactions.filter((transaction) => transaction.paymentMethod === 'installment' && transaction.paidVia === 'cash').reduce((sum, transaction) => sum + Number(transaction.paidNow || 0), 0)),
        installmentCardAdvance: round2(transactions.filter((transaction) => transaction.paymentMethod === 'installment' && transaction.paidVia === 'card').reduce((sum, transaction) => sum + Number(transaction.paidNow || 0), 0)),
        installmentCollectionsCash: round2(installmentCollections.filter((payment) => payment.paidVia === 'cash').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
        installmentCollectionsCard: round2(installmentCollections.filter((payment) => payment.paidVia === 'card').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
        expectedDrawerCash: 0,
    };
    totals.expectedDrawerCash = round2(
        Number(shift.openingCash || 0)
        + totals.cashSales
        + totals.creditCashReceived
        + totals.creditCollectionsCash
        + totals.installmentCashAdvance
        + totals.installmentCollectionsCash,
    );

    if (countedCash != null) {
        totals.countedCash = round2(countedCash);
        totals.cashDifference = round2(countedCash - totals.expectedDrawerCash);
    }

    return {
        shiftCode: shift.shiftCode,
        registerName: shift.registerName,
        cashierName: shift.openedByName,
        openingCash: Number(shift.openingCash || 0),
        openedAt: shift.openedAt,
        reportTime,
        status,
        totals,
    };
};

export const getCurrentShift = async (req: AuthRequest, res: Response) => {
    try {
        const shift = await POSShift.findOne({ ...buildTenantFilter(req.user!), status: 'open' }).lean();
        return res.json({ shift });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to load the current shift' });
    }
};

export const openShift = async (req: AuthRequest, res: Response) => {
    try {
        const openingCash = Number(req.body.openingCash);
        const registerName = String(req.body.registerName || 'Main Counter').trim();
        if (!Number.isFinite(openingCash) || openingCash < 0) return res.status(400).json({ message: 'Opening cash must be zero or more' });
        if (!registerName) return res.status(400).json({ message: 'Register name is required' });

        const existing = await POSShift.findOne({ ...buildTenantFilter(req.user!), status: 'open' }).lean();
        if (existing) return res.status(409).json({ message: `${existing.shiftCode} is already open` });

        const shift = await POSShift.create({
            shiftCode: `SH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
            registerName,
            openingCash,
            openedBy: req.user!.id,
            openedByName: req.user!.name || 'Staff',
            openedAt: new Date(),
            businessId: getTenantObjectId(req.user!),
        });
        return res.status(201).json({ shift });
    } catch (error: any) {
        if (error?.code === 11000) return res.status(409).json({ message: 'A POS shift is already open' });
        return res.status(400).json({ message: error.message || 'Failed to open shift' });
    }
};

export const getXReport = async (req: AuthRequest, res: Response) => {
    try {
        const shift = await POSShift.findOne({ ...buildTenantFilter(req.user!), status: 'open' });
        if (!shift) return res.status(404).json({ message: 'Open a POS shift before generating an X Report' });
        const report = await buildShiftReport(req, shift, new Date(), 'open');
        return res.json({ shift, report });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to generate X Report' });
    }
};

export const closeShift = async (req: AuthRequest, res: Response) => {
    const countedCash = Number(req.body.countedCash);
    if (!Number.isFinite(countedCash) || countedCash < 0) return res.status(400).json({ message: 'Counted cash must be zero or more' });

    const session = await mongoose.startSession();
    try {
        let closedShift: IPOSShift | null = null;
        await session.withTransaction(async () => {
            const shift = await POSShift.findOne({ ...buildTenantFilter(req.user!), status: 'open' }).session(session);
            if (!shift) throw new Error('There is no open POS shift to close');

            const closedAt = new Date();
            const report = await buildShiftReport(req, shift, closedAt, 'closed', countedCash, session);
            shift.status = 'closed';
            shift.closedAt = closedAt;
            shift.closedBy = new mongoose.Types.ObjectId(req.user!.id);
            shift.closedByName = req.user!.name || 'Staff';
            shift.countedCash = report.totals.countedCash;
            shift.cashDifference = report.totals.cashDifference;
            shift.finalReport = report;
            await shift.save({ session });
            closedShift = shift;
        });
        return res.json({ shift: closedShift, report: (closedShift as IPOSShift | null)?.finalReport });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to close shift' });
    } finally {
        await session.endSession();
    }
};

export const getShiftHistory = async (req: AuthRequest, res: Response) => {
    try {
        const shifts = await POSShift.find({ ...buildTenantFilter(req.user!), status: 'closed' })
            .sort({ closedAt: -1 })
            .limit(100)
            .lean();
        return res.json(shifts);
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to load Z Report history' });
    }
};
