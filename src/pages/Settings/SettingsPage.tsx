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
    TextField,
    Button,
    Stack,
    Alert,
    alpha,
    useTheme
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setDarkMode } from '../../features/theme/themeSlice';
import {
    countryCurrencyMap,
    fetchSettings,
    saveSettings,
    setCountry,
    setCurrency,
    setLowStockAlertsEnabled,
    setOrderUpdatesEnabled,
    clearSettingsError,
    type CountryCode,
    type CurrencyCode,
    type AppSettings,
    DEFAULT_APP_SETTINGS
} from '../../features/settings/settingsSlice';
import type { AppDispatch } from '../../store';
import { prepareBannerDataUrl } from '../../lib/imageBanner';

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

const countryOptions: Array<{ value: CountryCode; label: string }> = [
    { value: 'PK', label: 'Pakistan' },
    { value: 'US', label: 'United States' },
    { value: 'DE', label: 'Germany' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'CH', label: 'Switzerland' },
    { value: 'CD', label: 'DR Congo' },
    { value: 'CG', label: 'Congo' },
    { value: 'IN', label: 'India' },
    { value: 'AE', label: 'United Arab Emirates' },
];

const SettingsPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const { mode } = useSelector((state: RootState) => state.theme);
    const { user } = useSelector((state: RootState) => state.auth);
    const { notifications, country, currency, app, loading, error } = useSelector((state: RootState) => state.settings);
    const activeAppSettings = app || DEFAULT_APP_SETTINGS;
    const [appDraft, setAppDraft] = React.useState<AppSettings>(activeAppSettings);
    const [bannerError, setBannerError] = React.useState<string | null>(null);
    const bannerInputRef = React.useRef<HTMLInputElement>(null);
    // Admins own their workspace branding; the rest of the POS config stays super-admin only.
    const canEditBranding = user?.role === 'super_admin' || user?.role === 'admin';

    React.useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    React.useEffect(() => {
        setAppDraft(app || DEFAULT_APP_SETTINGS);
    }, [app]);

    const handleBannerFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setBannerError(null);
        try {
            const dataUrl = await prepareBannerDataUrl(file);
            setAppDraft((current) => ({ ...current, receiptBannerUrl: dataUrl }));
        } catch (error) {
            setBannerError(error instanceof Error ? error.message : 'That image could not be used as a banner.');
        }
    };

    const persistSettings = (
        nextCountry: CountryCode,
        nextCurrency: CurrencyCode,
        nextNotifications: typeof notifications,
        nextApp: AppSettings = activeAppSettings
    ) => {
        dispatch(saveSettings({
            country: nextCountry,
            currency: nextCurrency,
            notifications: nextNotifications,
            app: nextApp,
        }));
    };

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
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel
                                    id="country-select-label"
                                    sx={{
                                        fontWeight: 600,
                                        '&.Mui-focused': { color: 'primary.main' },
                                    }}
                                >
                                    Country
                                </InputLabel>
                                <Select
                                    labelId="country-select-label"
                                    value={country}
                                    label="Country"
                                    onChange={(e) => {
                                        const nextCountry = e.target.value as CountryCode;
                                        const nextCurrency = countryCurrencyMap[nextCountry];
                                        dispatch(setCountry(nextCountry));
                                        persistSettings(nextCountry, nextCurrency, notifications);
                                    }}
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
                                    {countryOptions.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            value={option.value}
                                            sx={{
                                                fontWeight: option.value === country ? 700 : 500,
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
                                    onChange={(e) => {
                                        const nextCurrency = e.target.value as CurrencyCode;
                                        dispatch(setCurrency(nextCurrency));
                                        persistSettings(country, nextCurrency, notifications);
                                    }}
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
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
                                Default currency follows the selected country. Pakistan starts with PKR by default.
                            </Typography>
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

                {user?.role === 'super_admin' && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom>Registration Access</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Choose whether new public signups create an account immediately or wait for approval.
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={1.5}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={appDraft.autoRegistrationEnabled}
                                                onChange={(event) => setAppDraft({ ...appDraft, autoRegistrationEnabled: event.target.checked })}
                                            />
                                        }
                                        label="Auto-register new accounts"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {appDraft.autoRegistrationEnabled
                                            ? 'New users get their workspace immediately.'
                                            : 'New signups are sent to Signup Requests for super admin approval.'}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => persistSettings(country, currency, notifications, appDraft)}
                                        disabled={loading}
                                    >
                                        Save Registration Setting
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {user?.role === 'super_admin' && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom>POS & Receipt</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Shared configuration used by every POS account and customer receipt.
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={2}>
                                    <TextField
                                        size="small"
                                        label="Sales Tax %"
                                        type="number"
                                        value={appDraft.salesTaxRate}
                                        onChange={(event) => setAppDraft({ ...appDraft, salesTaxRate: Number(event.target.value) })}
                                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={appDraft.installmentsEnabled}
                                                onChange={(event) => setAppDraft({ ...appDraft, installmentsEnabled: event.target.checked })}
                                            />
                                        }
                                        label="Enable installments for permitted accounts"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Super admin always keeps access. Enable this switch before granting installment access to selected accounts in Team Management.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => persistSettings(country, currency, notifications, appDraft)}
                                        disabled={loading}
                                    >
                                        Save POS Settings
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {canEditBranding && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom>Invoice & Receipt Branding</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    The banner prints at the top of receipts, order invoices, transaction invoices and stock slips.
                                    PNG, JPEG, WEBP or SVG; wide images work best.
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Stack spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        size="small"
                                        label="Shop Name"
                                        helperText="Printed beside the banner, e.g. HASSAN TRADERS"
                                        value={appDraft.shopName}
                                        onChange={(event) => setAppDraft({ ...appDraft, shopName: event.target.value })}
                                    />
                                    <TextField
                                        size="small"
                                        label="Shop Address"
                                        helperText="One line per row"
                                        value={appDraft.shopAddress}
                                        onChange={(event) => setAppDraft({ ...appDraft, shopAddress: event.target.value })}
                                        multiline
                                        rows={2}
                                    />
                                    <TextField
                                        size="small"
                                        label="Shop Phone"
                                        helperText="One contact per line, e.g. Tariq Shah : 0315-0808002"
                                        value={appDraft.shopPhone}
                                        onChange={(event) => setAppDraft({ ...appDraft, shopPhone: event.target.value })}
                                        multiline
                                        rows={2}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: '1px dashed',
                                        borderColor: alpha(theme.palette.primary.main, 0.35),
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        textAlign: 'center',
                                    }}
                                >
                                    {appDraft.receiptBannerUrl ? (
                                        <Box
                                            component="img"
                                            src={appDraft.receiptBannerUrl}
                                            alt="Receipt banner preview"
                                            sx={{ display: 'block', mx: 'auto', maxWidth: '100%', maxHeight: 96, objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No banner uploaded yet.
                                        </Typography>
                                    )}
                                </Box>

                                {bannerError && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                        {bannerError}
                                    </Typography>
                                )}

                                {error && (
                                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => dispatch(clearSettingsError())}>
                                        {error}
                                    </Alert>
                                )}

                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <Button variant="outlined" onClick={() => bannerInputRef.current?.click()}>
                                        {appDraft.receiptBannerUrl ? 'Replace Banner' : 'Upload Banner'}
                                    </Button>
                                    {appDraft.receiptBannerUrl && (
                                        <Button
                                            color="error"
                                            onClick={() => {
                                                setBannerError(null);
                                                setAppDraft({ ...appDraft, receiptBannerUrl: '' });
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                    <Button
                                        variant="contained"
                                        sx={{ ml: 'auto' }}
                                        onClick={() => persistSettings(country, currency, notifications, appDraft)}
                                        disabled={loading}
                                    >
                                        Save Branding
                                    </Button>
                                </Stack>
                                <input
                                    ref={bannerInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    style={{ display: 'none' }}
                                    onChange={handleBannerFileChange}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Notifications</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.orderUpdates}
                                        onChange={(e) => {
                                            const nextNotifications = {
                                                ...notifications,
                                                orderUpdates: e.target.checked,
                                            };
                                            dispatch(setOrderUpdatesEnabled(e.target.checked));
                                            persistSettings(country, currency, nextNotifications);
                                        }}
                                    />
                                }
                                label="Order updates"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.lowStockAlerts}
                                        onChange={(e) => {
                                            const nextNotifications = {
                                                ...notifications,
                                                lowStockAlerts: e.target.checked,
                                            };
                                            dispatch(setLowStockAlertsEnabled(e.target.checked));
                                            persistSettings(country, currency, nextNotifications);
                                        }}
                                    />
                                }
                                label="Low stock alerts"
                            />
                            <Typography variant="caption" color="text.secondary">
                                {loading ? 'Saving changes...' : 'Settings are synced with the backend database.'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SettingsPage;
