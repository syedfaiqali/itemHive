import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../features/auth/authSlice';
import inventoryReducer, { initialProductsFromCsv } from '../features/inventory/inventorySlice';
import transactionReducer from '../features/transactions/transactionSlice';
import themeReducer from '../features/theme/themeSlice';
import posReducer from '../features/pos/posSlice';
import ordersReducer from '../features/orders/ordersSlice';
import settingsReducer from '../features/settings/settingsSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    inventory: inventoryReducer,
    transactions: transactionReducer,
    theme: themeReducer,
    pos: posReducer,
    orders: ordersReducer,
    settings: settingsReducer,
});

const persistConfig = {
    key: 'root',
    version: 4,
    storage,
    whitelist: ['auth', 'inventory', 'transactions', 'theme', 'orders', 'settings'], // Persist these slices
    migrate: (state: unknown) => {
        if (!state) return Promise.resolve(state);
        const nextState = { ...(state as Record<string, unknown>) } as Record<string, unknown>;
        if (nextState.inventory) {
            nextState.inventory = {
                ...(nextState.inventory as Record<string, unknown>),
                products: initialProductsFromCsv,
                loading: false,
                error: null,
            };
        }
        return Promise.resolve(nextState);
    },
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
