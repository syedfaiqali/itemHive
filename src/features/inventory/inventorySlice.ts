import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import stockCsv from '../../tableau_stock.csv?raw';

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

const normalizeNumber = (value: string | undefined): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.').trim();
    const parts = normalized.split(/[–-]/).map(p => p.trim()).filter(Boolean);
    const first = parts[0] || '';
    const numeric = first.replace(/[^\d.]/g, '');
    const parsed = parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed : 0;
};

const slugToSku = (name: string): string => {
    const cleaned = name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned.slice(0, 18) || `SKU-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const parseStockCsv = (csv: string): Product[] => {
    const lines = csv.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    return lines.slice(1).map((line, index) => {
        const [article = '', qty = '', price = '', date = ''] = line.split(',').map(item => item.trim());
        const stock = normalizeNumber(qty);
        const unitPrice = normalizeNumber(price);
        const timestamp = new Date().toISOString();
        const description = date ? `Date: ${date}` : 'Imported from stock CSV';
        const category = inferCategory(article);
        const imageUrl = getImageForProduct(article, category);

        return {
            id: `${index + 1}`,
            sku: slugToSku(article || `ITEM-${index + 1}`),
            name: article || `Item ${index + 1}`,
            category,
            price: unitPrice,
            stock,
            minStock: 5,
            description,
            imageUrl,
            lastUpdated: timestamp,
        };
    });
};

const inferCategory = (name: string): string => {
    const n = name.toLowerCase();
    if (/(lays|pringles|chips|snack|bounty|mars|snicker|twix|kit kat|oreo|milka|nutella|haribo|m\&ms|chupa|candy|choco|chocolate|biscuit|cookie|wafer|smarties|dragibus)/.test(n)) {
        return 'Snacks & Candy';
    }
    if (/(mentos|freedent|stimorol|hollywood|bubblicious|gum|tictac|tic tac)/.test(n)) {
        return 'Gum & Mints';
    }
    if (/(duerex|durex|condom)/.test(n)) {
        return 'Health & Personal';
    }
    if (/(lighter|clipper|bic|grinder|pipe)/.test(n)) {
        return 'Accessories';
    }
    if (/(rizla|filter|carton|rolling|smoking|raw|tips|top roll|top filter)/.test(n)) {
        return 'Rolling Supplies';
    }
    if (/(nesquick|chocapik|crunch|cereal|pizza)/.test(n)) {
        return 'Groceries';
    }
    return 'General';
};

const makePlaceholder = (label: string): string =>
    `https://placehold.co/160x160/png?text=${encodeURIComponent(label)}`;

const IMAGE_SNACKS = makePlaceholder('Snacks');
const IMAGE_OREO = makePlaceholder('Oreo');
const IMAGE_TWIX = makePlaceholder('Twix');
const IMAGE_SNICKERS = makePlaceholder('Snickers');
const IMAGE_MENTOS = makePlaceholder('Mentos');
const IMAGE_RIZLA = makePlaceholder('Rizla');
const IMAGE_JAM = makePlaceholder('Jam');

export const getImageForProduct = (name: string, category: string): string => {
    const n = name.toLowerCase();
    if (/(jam|confiture)/.test(n)) return IMAGE_JAM;
    if (/(oreo)/.test(n)) return IMAGE_OREO;
    if (/(twix)/.test(n)) return IMAGE_TWIX;
    if (/(snicker)/.test(n)) return IMAGE_SNICKERS;
    if (/(m\&m)/.test(n)) return IMAGE_SNACKS;
    if (/(mentos)/.test(n)) return IMAGE_MENTOS;
    if (/(rizla|rolling|filter|tips)/.test(n)) return IMAGE_RIZLA;
    if (category === 'Gum & Mints') return IMAGE_MENTOS;
    if (category === 'Rolling Supplies' || category === 'Accessories') return IMAGE_RIZLA;
    if (category === 'Snacks & Candy' || category === 'Groceries') return IMAGE_SNACKS;
    return IMAGE_SNACKS;
};

export const resolveProductImage = (product: Pick<Product, 'name' | 'category' | 'imageUrl'>): string => {
    if (product.imageUrl && product.imageUrl.trim().length > 0) {
        const trimmed = product.imageUrl.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
            return trimmed;
        }
    }
    return getImageForProduct(product.name, product.category);
};

export const placeholderFallback = makePlaceholder('Item');

export const initialProductsFromCsv = parseStockCsv(stockCsv);

const initialState: InventoryState = {
    products: initialProductsFromCsv,
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
