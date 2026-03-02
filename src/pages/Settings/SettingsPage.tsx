import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Divider,
    Switch,
    FormControlLabel
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setDarkMode } from '../../features/theme/themeSlice';
import { setLowStockAlertsEnabled, setOrderUpdatesEnabled } from '../../features/settings/settingsSlice';

const SettingsPage: React.FC = () => {
    const dispatch = useDispatch();
    const { mode } = useSelector((state: RootState) => state.theme);
    const { notifications } = useSelector((state: RootState) => state.settings);

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
