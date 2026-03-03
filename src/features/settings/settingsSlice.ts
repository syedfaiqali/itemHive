import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NotificationSettings {
    orderUpdates: boolean;
    lowStockAlerts: boolean;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'PKR' | 'INR' | 'AED';

interface SettingsState {
    notifications: NotificationSettings;
    currency: CurrencyCode;
}

const initialState: SettingsState = {
    notifications: {
        orderUpdates: true,
        lowStockAlerts: true,
    },
    currency: 'USD',
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setOrderUpdatesEnabled: (state, action: PayloadAction<boolean>) => {
            state.notifications.orderUpdates = action.payload;
        },
        setLowStockAlertsEnabled: (state, action: PayloadAction<boolean>) => {
            state.notifications.lowStockAlerts = action.payload;
        },
        setCurrency: (state, action: PayloadAction<CurrencyCode>) => {
            state.currency = action.payload;
        },
    },
});

export const { setOrderUpdatesEnabled, setLowStockAlertsEnabled, setCurrency } = settingsSlice.actions;
export default settingsSlice.reducer;
