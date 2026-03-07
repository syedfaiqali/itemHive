import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/axios';

export interface Product {
    _id?: string;
    id: string; // The readable ID (e.g. "1")
    sku: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    minStock: number;
    description: string;
    imageUrl?: string;
    lastUpdated: string;
    batchNumber?: string;
    expiryDate?: string;
    supplier?: string;
}

interface InventoryState {
    products: Product[];
    loading: boolean;
    error: string | null;
}

const initialState: InventoryState = {
    products: [],
    loading: false,
    error: null,
};

// Async Thunks
export const fetchProducts = createAsyncThunk(
    'inventory/fetchProducts',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/products');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
        }
    }
);

export const addProductApi = createAsyncThunk(
    'inventory/addProduct',
    async (product: Product, { rejectWithValue }) => {
        try {
            const response = await api.post('/products', product);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add product');
        }
    }
);

export const updateProductApi = createAsyncThunk(
    'inventory/updateProduct',
    async (product: Product, { rejectWithValue }) => {
        try {
            const response = await api.put(`/products/${product.id}`, product);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update product');
        }
    }
);

export const deleteProductApi = createAsyncThunk(
    'inventory/deleteProduct',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/products/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
        }
    }
);

export const reduceStockApi = createAsyncThunk(
    'inventory/reduceStock',
    async (data: { id: string; amount: number; transaction: any }, { rejectWithValue }) => {
        try {
            // Typically, in a POS scenario, we just create a transaction
            // and the backend handles the stock reduction atomically.
            await api.post('/transactions', data.transaction);
            return { id: data.id, amount: data.amount };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to process transaction');
        }
    }
);

export const PRODUCT_CATEGORIES = [
    'Snacks & Candy',
    'Gum & Mints',
    'Health & Personal',
    'Accessories',
    'Rolling Supplies',
    'Groceries',
    'General'
];

export const placeholderFallback = `https://placehold.co/160x160/png?text=Item`;

export const resolveProductImage = (product: Pick<Product, 'name' | 'category' | 'imageUrl'>): string => {
    if (product.imageUrl && product.imageUrl.trim().length > 0) {
        const trimmed = product.imageUrl.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
            return trimmed;
        }
    }
    return placeholderFallback;
};

const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        clearInventoryError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
                state.loading = false;
                state.products = action.payload;
            })
            .addCase(fetchProducts.rejected, (state, action: PayloadAction<any>) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Add
            .addCase(addProductApi.fulfilled, (state, action: PayloadAction<Product>) => {
                state.products.push(action.payload);
            })
            // Update
            .addCase(updateProductApi.fulfilled, (state, action: PayloadAction<Product>) => {
                const index = state.products.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.products[index] = action.payload;
                }
            })
            // Delete
            .addCase(deleteProductApi.fulfilled, (state, action: PayloadAction<string>) => {
                state.products = state.products.filter(p => p.id !== action.payload);
            })
            // Reduce Stock (local optimistic update or synced result)
            .addCase(reduceStockApi.fulfilled, (state, action: PayloadAction<{ id: string; amount: number }>) => {
                const product = state.products.find(p => p.id === action.payload.id);
                if (product) {
                    product.stock -= action.payload.amount;
                    product.lastUpdated = new Date().toISOString();
                }
            });
    },
});

export const { clearInventoryError } = inventorySlice.actions;
export default inventorySlice.reducer;
