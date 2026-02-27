import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Transaction {
    id: string;
    productId: string;
    productName: string;
    type: 'addition' | 'reduction';
    amount: number;
    userName: string;
    timestamp: string;
    totalPrice?: number;
}

interface TransactionState {
    transactions: Transaction[];
}

const initialState: TransactionState = {
    transactions: [],
};

const transactionSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        addTransaction: (state, action: PayloadAction<Transaction>) => {
            state.transactions.unshift(action.payload);
        },
    },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice.reducer;
