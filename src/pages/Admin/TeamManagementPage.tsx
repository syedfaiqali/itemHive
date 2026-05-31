import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Edit3, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User } from '../../features/auth/authSlice';
import api from '../../api/axios';

interface UsersPage {
    users: User[];
    total: number;
}

type UsersResponse = UsersPage | User[];

interface AccountDraft {
    name: string;
    email: string;
    password: string;
    userCreationLimit: string;
}

const roleLabel = (role: User['role']) =>
    role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User';

const TeamManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useSelector((state: RootState) => state.auth);
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [savingId, setSavingId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(20);
    const [total, setTotal] = React.useState(0);
    const [editingUser, setEditingUser] = React.useState<User | null>(null);
    const [draft, setDraft] = React.useState<AccountDraft>({ name: '', email: '', password: '', userCreationLimit: '0' });
    const [snack, setSnack] = React.useState('');
    const [error, setError] = React.useState('');

    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get<UsersResponse>('/users', {
                params: { page: page + 1, limit: rowsPerPage, search: search.trim() || undefined },
            });
            const nextUsers = Array.isArray(response.data) ? response.data : response.data.users || [];
            setUsers(nextUsers);
            setTotal(Array.isArray(response.data) ? nextUsers.length : response.data.total || 0);
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || 'Unable to load team members right now.');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search]);

    React.useEffect(() => {
        const timeoutId = window.setTimeout(loadUsers, 250);
        return () => window.clearTimeout(timeoutId);
    }, [loadUsers]);

    const handleStatusChange = async (target: User, updates: { isActive?: boolean; isVisible?: boolean; installmentAccess?: boolean }) => {
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

    const openEditDialog = (target: User) => {
        setEditingUser(target);
        setDraft({
            name: target.name,
            email: target.email,
            password: '',
            userCreationLimit: String(target.userCreationLimit ?? 0),
        });
    };

    const saveAccount = async () => {
        if (!editingUser) return;

        setSavingId(editingUser.id);
        try {
            await api.patch(`/users/${editingUser.id}/account`, {
                name: draft.name,
                email: draft.email,
                password: draft.password,
            });
            if (editingUser.role === 'admin') {
                await api.patch(`/users/${editingUser.id}/limit`, {
                    userCreationLimit: Number(draft.userCreationLimit || 0),
                });
            }
            setEditingUser(null);
            await loadUsers();
            setSnack('Account details updated successfully.');
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || requestError?.response?.data?.details || 'Unable to update this account.');
        } finally {
            setSavingId('');
        }
    };

    return (
        <Box>
            <Snackbar open={Boolean(snack)} autoHideDuration={2600} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" sx={{ width: '100%' }}>{snack}</Alert>
            </Snackbar>

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Team Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isSuperAdmin
                            ? 'Search and manage shop accounts from one scalable grid.'
                            : `You can create users up to your assigned limit of ${currentUser?.userCreationLimit ?? 0}.`}
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<UserPlus size={18} />} onClick={() => navigate('/signup')} sx={{ borderRadius: 2, fontWeight: 800 }}>
                    {isSuperAdmin ? 'Create Account' : 'Add User'}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                }}
                placeholder="Search by name, login email, or role"
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
                sx={{ mb: 2, maxWidth: 560 }}
            />

            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table size="small" sx={{ minWidth: 1060 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Account</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="center">Active</TableCell>
                            <TableCell align="center">Visible</TableCell>
                            <TableCell align="center">Installments</TableCell>
                            <TableCell align="center">User Limit</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress size={30} /></TableCell>
                            </TableRow>
                        )}
                        {!loading && users.map((teamUser) => {
                            const isBusy = savingId === teamUser.id;
                            const isManageable = isSuperAdmin && teamUser.role !== 'super_admin';
                            return (
                                <TableRow key={teamUser.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={800}>{teamUser.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{teamUser.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip icon={<ShieldCheck size={14} />} label={roleLabel(teamUser.role)} color={teamUser.role === 'user' ? 'default' : 'primary'} size="small" />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch size="small" checked={Boolean(teamUser.isActive)} disabled={!isManageable || isBusy} onChange={(_, checked) => handleStatusChange(teamUser, { isActive: checked })} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch size="small" checked={Boolean(teamUser.isVisible)} disabled={!isManageable || isBusy} onChange={(_, checked) => handleStatusChange(teamUser, { isVisible: checked })} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch size="small" checked={Boolean(teamUser.installmentAccess)} disabled={!isManageable || isBusy} onChange={(_, checked) => handleStatusChange(teamUser, { installmentAccess: checked })} />
                                    </TableCell>
                                    <TableCell align="center">{teamUser.role === 'admin' ? teamUser.userCreationLimit ?? 0 : '-'}</TableCell>
                                    <TableCell align="right">
                                        {isManageable && (
                                            <Button size="small" variant="outlined" startIcon={<Edit3 size={15} />} onClick={() => openEditDialog(teamUser)} disabled={isBusy}>
                                                Edit
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!loading && !users.length && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Users size={34} style={{ opacity: 0.45, marginBottom: 8 }} />
                                    <Typography variant="body2" color="text.secondary">No matching accounts found.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                />
            </TableContainer>

            <Dialog open={Boolean(editingUser)} onClose={() => setEditingUser(null)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Account</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField label="Full Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                        <TextField label="Login Email / ID" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
                        <TextField label="New Password" type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} helperText="Leave blank to keep the existing password." />
                        {editingUser?.role === 'admin' && (
                            <TextField label="User Creation Limit" type="number" value={draft.userCreationLimit} onChange={(event) => setDraft({ ...draft, userCreationLimit: event.target.value })} inputProps={{ min: 0 }} />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button variant="contained" onClick={saveAccount} disabled={savingId === editingUser?.id}>Save Changes</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamManagementPage;
