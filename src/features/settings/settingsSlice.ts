import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NotificationSettings {
    orderUpdates: boolean;
    lowStockAlerts: boolean;
}

interface SettingsState {
    notifications: NotificationSettings;
}

const initialState: SettingsState = {
    notifications: {
        orderUpdates: true,
        lowStockAlerts: true,
    },
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
    },
});

export const { setOrderUpdatesEnabled, setLowStockAlertsEnabled } = settingsSlice.actions;
export default settingsSlice.reducer;
