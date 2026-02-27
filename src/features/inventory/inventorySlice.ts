import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    minStock: number;
    description: string;
    imageUrl?: string;
    lastUpdated: string;
}

interface InventoryState {
    products: Product[];
    loading: boolean;
    error: string | null;
}

const initialState: InventoryState = {
    products: [
        {
            id: '1',
            sku: 'LAP-MBP-14',
            name: 'MacBook Pro 14"',
            category: 'Electronics',
            price: 1999,
            stock: 15,
            minStock: 5,
            description: 'M3 Pro chip, 16GB RAM, 512GB SSD',
            lastUpdated: new Date().toISOString(),
        },
        {
            id: '2',
            sku: 'PHN-I15-PRO',
            name: 'iPhone 15 Pro',
            category: 'Electronics',
            price: 999,
            stock: 25,
            minStock: 10,
            description: 'Titanium design, A17 Pro chip',
            lastUpdated: new Date().toISOString(),
        },
        {
            id: '3',
            sku: 'ACC-SONY-XM5',
            name: 'Sony WH-1000XM5',
            category: 'Accessories',
            price: 399,
            stock: 8,
            minStock: 5,
            description: 'Noise cancelling wireless headphones',
            lastUpdated: new Date().toISOString(),
        },
    ],
    loading: false,
    error: null,
};

const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        addProduct: (state, action: PayloadAction<Product>) => {
            state.products.push(action.payload);
        },
        updateProduct: (state, action: PayloadAction<Product>) => {
            const index = state.products.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.products[index] = action.payload;
            }
        },
        deleteProduct: (state, action: PayloadAction<string>) => {
            state.products = state.products.filter(p => p.id !== action.payload);
        },
        reduceStock: (state, action: PayloadAction<{ id: string; amount: number }>) => {
            const product = state.products.find(p => p.id === action.payload.id);
            if (product && product.stock >= action.payload.amount) {
                product.stock -= action.payload.amount;
                product.lastUpdated = new Date().toISOString();
            }
        },
    },
});

export const { addProduct, updateProduct, deleteProduct, reduceStock } = inventorySlice.actions;
export default inventorySlice.reducer;
