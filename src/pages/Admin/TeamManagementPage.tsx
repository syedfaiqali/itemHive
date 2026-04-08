import React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User } from '../../features/auth/authSlice';
import api from '../../api/axios';

const TeamManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useSelector((state: RootState) => state.auth);
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [savingId, setSavingId] = React.useState('');
    const [limitDrafts, setLimitDrafts] = React.useState<Record<string, string>>({});
    const [snack, setSnack] = React.useState('');
    const [error, setError] = React.useState('');

    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/users');
            const nextUsers = response.data as User[];
            setUsers(nextUsers);
            setLimitDrafts(
                nextUsers.reduce<Record<string, string>>((acc, teamUser) => {
                    acc[teamUser.id] = String(teamUser.userCreationLimit ?? 0);
                    return acc;
                }, {})
            );
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || 'Unable to load team members right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleStatusChange = async (target: User, updates: { isActive?: boolean; isVisible?: boolean }) => {
        setSavingId(target.id);

        try {
            await api.patch(`/users/${target.id}/status`, updates);
            await loadUsers();
            setSnack('Account updated successfully.');
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || 'Unable to update this account.');
        } finally {
            setSavingId('');
        }
    };

    const handleLimitSave = async (target: User) => {
        setSavingId(target.id);

        try {
            await api.patch(`/users/${target.id}/limit`, {
                userCreationLimit: Number(limitDrafts[target.id] || 0),
            });
            await loadUsers();
            setSnack('Admin user limit updated.');
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || 'Unable to update this limit.');
        } finally {
            setSavingId('');
        }
    };

    return (
        <Box>
            <Snackbar
                open={Boolean(snack)}
                autoHideDuration={2600}
                onClose={() => setSnack('')}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnack('')} severity="success" sx={{ width: '100%' }}>
                    {snack}
                </Alert>
            </Snackbar>

            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Team Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isSuperAdmin
                            ? 'Super admin can activate, deactivate, hide, show, and assign admin user limits.'
                            : `You can create users up to your assigned limit of ${currentUser?.userCreationLimit ?? 0}.`}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<UserPlus size={18} />}
                    onClick={() => navigate('/signup')}
                    sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                    {isSuperAdmin ? 'Create Account' : 'Add User'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {users.map((teamUser) => {
                        const isBusy = savingId === teamUser.id;
                        const isManageable = teamUser.role !== 'super_admin';

                        return (
                            <Grid key={teamUser.id} size={{ xs: 12, md: 6 }}>
                                <Card sx={{ borderRadius: 4, height: '100%' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={800}>{teamUser.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">{teamUser.email}</Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="flex-end">
                                                <Chip
                                                    icon={<ShieldCheck size={14} />}
                                                    label={teamUser.role === 'super_admin' ? 'Super Admin' : teamUser.role === 'admin' ? 'Admin' : 'User'}
                                                    color={teamUser.role === 'user' ? 'default' : 'primary'}
                                                    size="small"
                                                />
                                                <Chip label={teamUser.isActive ? 'Active' : 'Inactive'} color={teamUser.isActive ? 'success' : 'error'} size="small" />
                                                <Chip label={teamUser.isVisible ? 'Visible' : 'Hidden'} color={teamUser.isVisible ? 'info' : 'default'} size="small" />
                                            </Stack>
                                        </Stack>

                                        {isSuperAdmin && isManageable && (
                                            <Stack spacing={2} sx={{ mt: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={700}>Account active</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Deactivated accounts cannot sign in.
                                                        </Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={Boolean(teamUser.isActive)}
                                                        onChange={(_, checked) => handleStatusChange(teamUser, { isActive: checked })}
                                                        disabled={isBusy}
                                                    />
                                                </Box>

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={700}>Show in management lists</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Hidden accounts stay out of standard listings.
                                                        </Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={Boolean(teamUser.isVisible)}
                                                        onChange={(_, checked) => handleStatusChange(teamUser, { isVisible: checked })}
                                                        disabled={isBusy}
                                                    />
                                                </Box>

                                                {teamUser.role === 'admin' && (
                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                                        <TextField
                                                            label="User Limit"
                                                            type="number"
                                                            size="small"
                                                            value={limitDrafts[teamUser.id] ?? '0'}
                                                            onChange={(event) => setLimitDrafts((current) => ({
                                                                ...current,
                                                                [teamUser.id]: event.target.value,
                                                            }))}
                                                            inputProps={{ min: 0 }}
                                                            sx={{ maxWidth: 180 }}
                                                        />
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => handleLimitSave(teamUser)}
                                                            disabled={isBusy}
                                                        >
                                                            Save Limit
                                                        </Button>
                                                    </Stack>
                                                )}
                                            </Stack>
                                        )}

                                        {!isSuperAdmin && (
                                            <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
                                                <Typography variant="subtitle2" fontWeight={700}>Created users you manage</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    You can add users from the create account screen until your assigned limit is reached.
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}

                    {!users.length && (
                        <Grid size={12}>
                            <Card sx={{ borderRadius: 4 }}>
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <Users size={38} style={{ opacity: 0.45, marginBottom: 12 }} />
                                    <Typography variant="h6" fontWeight={800}>No team accounts yet</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Create the first account for your team from the button above.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
};

export default TeamManagementPage;
