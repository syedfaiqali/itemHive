import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
    mode: 'light' | 'dark';
}

const initialState: ThemeState = {
    mode: 'light',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setDarkMode: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.mode = action.payload;
        },
        toggleDarkMode: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
        },
    },
});

export const { setDarkMode, toggleDarkMode } = themeSlice.actions;
export default themeSlice.reducer;
