import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Divider,
    Switch,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    alpha,
    useTheme
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setDarkMode } from '../../features/theme/themeSlice';
import { setCurrency, setLowStockAlertsEnabled, setOrderUpdatesEnabled, type CurrencyCode } from '../../features/settings/settingsSlice';

const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CDF', label: 'CDF - Congolese Franc (DRC)' },
    { value: 'XAF', label: 'XAF - Central African CFA Franc (Congo)' },
    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'AED', label: 'AED - UAE Dirham' },
];

const SettingsPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const { mode } = useSelector((state: RootState) => state.theme);
    const { notifications, currency } = useSelector((state: RootState) => state.settings);

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800}>Settings</Typography>
                <Typography variant="body2" color="text.secondary">
                    Personalize your workspace and preferences.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Regional</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <FormControl fullWidth size="small">
                                <InputLabel
                                    id="currency-select-label"
                                    sx={{
                                        fontWeight: 600,
                                        '&.Mui-focused': { color: 'primary.main' },
                                    }}
                                >
                                    Currency
                                </InputLabel>
                                <Select
                                    labelId="currency-select-label"
                                    value={currency}
                                    label="Currency"
                                    onChange={(e) => dispatch(setCurrency(e.target.value as CurrencyCode))}
                                    sx={{
                                        fontWeight: 600,
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: alpha(theme.palette.primary.main, 0.25),
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: alpha(theme.palette.primary.main, 0.5),
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'primary.main',
                                            borderWidth: 2,
                                        },
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                mt: 0.5,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                            },
                                        },
                                    }}
                                >
                                    {currencyOptions.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            value={option.value}
                                            sx={{
                                                fontWeight: option.value === currency ? 700 : 500,
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                    color: 'primary.main',
                                                },
                                                '&.Mui-selected': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.14),
                                                    color: 'primary.main',
                                                },
                                                '&.Mui-selected:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                                },
                                            }}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Appearance</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={mode === 'dark'}
                                        onChange={(e) => dispatch(setDarkMode(e.target.checked ? 'dark' : 'light'))}
                                    />
                                }
                                label="Enable dark mode"
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Notifications</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.orderUpdates}
                                        onChange={(e) => dispatch(setOrderUpdatesEnabled(e.target.checked))}
                                    />
                                }
                                label="Order updates"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.lowStockAlerts}
                                        onChange={(e) => dispatch(setLowStockAlertsEnabled(e.target.checked))}
                                    />
                                }
                                label="Low stock alerts"
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SettingsPage;
