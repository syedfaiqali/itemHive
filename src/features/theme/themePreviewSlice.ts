import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Appearance } from '../auth/authSlice';

// Transient UI state: deliberately excluded from redux-persist.
const themePreviewSlice = createSlice({
    name: 'themePreview',
    initialState: { value: null as { userId: string; appearance: Appearance } | null },
    reducers: {
        setThemePreview: (state, action: PayloadAction<{ userId: string; appearance: Appearance }>) => {
            state.value = action.payload;
        },
        clearThemePreview: state => { state.value = null; },
    },
});

export const { setThemePreview, clearThemePreview } = themePreviewSlice.actions;
export default themePreviewSlice.reducer;
