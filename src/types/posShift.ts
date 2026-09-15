export interface ShiftReportTotals {
    completedOrders: number;
    itemsSold: number;
    grossSales: number;
    discounts: number;
    tax: number;
    netSales: number;
    cashSales: number;
    cardSales: number;
    creditSales: number;
    creditCashReceived: number;
    creditCardReceived: number;
    creditCollectionsCash: number;
    creditCollectionsCard: number;
    installmentSales: number;
    installmentCashAdvance: number;
    installmentCardAdvance: number;
    installmentCollectionsCash: number;
    installmentCollectionsCard: number;
    expectedDrawerCash: number;
    countedCash?: number;
    cashDifference?: number;
}

export interface ShiftReport {
    shiftCode: string;
    registerName: string;
    cashierName: string;
    openingCash: number;
    openedAt: string;
    reportTime: string;
    status: 'open' | 'closed';
    totals: ShiftReportTotals;
}

export interface POSShift {
    _id: string;
    shiftCode: string;
    registerName: string;
    openingCash: number;
    status: 'open' | 'closed';
    openedByName: string;
    openedAt: string;
    closedByName?: string;
    closedAt?: string;
    countedCash?: number;
    cashDifference?: number;
    finalReport?: ShiftReport;
}
