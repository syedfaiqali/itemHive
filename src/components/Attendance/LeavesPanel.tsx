import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { CalendarPlus, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../../api/axios';
import { formatDateKey, getInitials, toLocalDateKey } from '../../lib/employees';
import { LEAVE_TYPE_LABELS, type EmployeeLeave, type EmployeeSummary, type LeaveType } from '../../types/employee';

interface LeaveForm {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as AxiosError<{ message?: string }>).response?.data?.message || fallback;

const monthRange = (month: string) => {
    const [year, monthIndex] = month.split('-').map(Number);
    return { from: `${month}-01`, to: toLocalDateKey(new Date(year, monthIndex, 0)) };
};

const leaveColors: Record<LeaveType, 'info' | 'error' | 'success' | 'warning' | 'default'> = {
    casual: 'info',
    sick: 'error',
    annual: 'success',
    unpaid: 'warning',
    other: 'default',
};

const LeavesPanel: React.FC = () => {
    const [month, setMonth] = React.useState(() => toLocalDateKey().slice(0, 7));
    const [employees, setEmployees] = React.useState<EmployeeSummary[]>([]);
    const [leaves, setLeaves] = React.useState<EmployeeLeave[]>([]);
    const [form, setForm] = React.useState<LeaveForm | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<EmployeeLeave | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        api.get('/attendance/employees')
            .then((response) => setEmployees(response.data || []))
            .catch((fetchError: unknown) => setError(getErrorMessage(fetchError, 'Unable to load employees.')));
    }, []);

    const loadLeaves = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/attendance/leaves', { params: monthRange(month) });
            setLeaves(response.data || []);
        } catch (fetchError: unknown) {
            setError(getErrorMessage(fetchError, 'Unable to load leaves.'));
        } finally {
            setLoading(false);
        }
    }, [month]);

    React.useEffect(() => {
        loadLeaves();
    }, [loadLeaves]);

    const activeEmployees = employees.filter((employee) => employee.status === 'active');

    const openCreate = () => {
        const today = toLocalDateKey();
        setForm({ employeeId: activeEmployees[0]?._id || '', leaveType: 'casual', startDate: today, endDate: today, reason: '' });
    };

    const handleSave = async () => {
        if (!form) return;
        if (!form.employeeId) {
            setError('Choose an employee.');
            return;
        }
        if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
            setError('Choose a valid leave date range.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post('/attendance/leaves', { ...form, reason: form.reason.trim() });
            setForm(null);
            await loadLeaves();
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError, 'Unable to save leave.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        setError('');
        try {
            await api.delete(`/attendance/leaves/${deleteTarget._id}`);
            setLeaves((current) => current.filter((leave) => leave._id !== deleteTarget._id));
            setDeleteTarget(null);
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError, 'Unable to delete leave.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2.5 }}>
                <TextField type="month" size="small" label="Month" InputLabelProps={{ shrink: true }} value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
                <Button variant="contained" startIcon={<CalendarPlus size={18} />} onClick={openCreate} disabled={activeEmployees.length === 0} sx={{ fontWeight: 800 }}>
                    Add Leave
                </Button>
            </Stack>

            {error && !form && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table sx={{ minWidth: 760 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>EMPLOYEE</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>TYPE</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>FROM</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>TO</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>DAYS</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>REASON</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leaves.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">{loading ? 'Loading leaves...' : 'No leaves in this month.'}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : leaves.map((leave) => (
                            <TableRow key={leave._id} hover>
                                <TableCell>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar src={leave.employee.photo || undefined} sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 800, bgcolor: 'primary.main' }}>
                                            {getInitials(leave.employee.fullName)}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight={800}>{leave.employee.fullName}</Typography>
                                            <Typography variant="caption" color="text.secondary">{leave.employee.employeeCode}</Typography>
                                        </Box>
                                    </Stack>
                                </TableCell>
                                <TableCell><Chip size="small" color={leaveColors[leave.leaveType]} label={LEAVE_TYPE_LABELS[leave.leaveType]} /></TableCell>
                                <TableCell>{formatDateKey(leave.startDate)}</TableCell>
                                <TableCell>{formatDateKey(leave.endDate)}</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>{leave.days}</TableCell>
                                <TableCell sx={{ maxWidth: 260 }}>
                                    <Typography variant="body2" color="text.secondary" noWrap>{leave.reason || '-'}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Delete leave">
                                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(leave)}><Trash2 size={17} /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={Boolean(form)} onClose={() => setForm(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Add Leave</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <TextField select fullWidth label="Employee" value={form?.employeeId || ''} onChange={(event) => setForm((current) => current && { ...current, employeeId: event.target.value })}>
                                {activeEmployees.map((employee) => (
                                    <MenuItem key={employee._id} value={employee._id}>{employee.fullName} ({employee.employeeCode})</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TextField select fullWidth label="Leave Type" value={form?.leaveType || 'casual'} onChange={(event) => setForm((current) => current && { ...current, leaveType: event.target.value as LeaveType })}>
                                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="From"
                                InputLabelProps={{ shrink: true }}
                                value={form?.startDate || ''}
                                onChange={(event) => setForm((current) => current && {
                                    ...current,
                                    startDate: event.target.value,
                                    endDate: current.endDate < event.target.value ? event.target.value : current.endDate,
                                })}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField fullWidth type="date" label="To" InputLabelProps={{ shrink: true }} inputProps={{ min: form?.startDate }} value={form?.endDate || ''} onChange={(event) => setForm((current) => current && { ...current, endDate: event.target.value })} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth multiline minRows={2} label="Reason" value={form?.reason || ''} onChange={(event) => setForm((current) => current && { ...current, reason: event.target.value })} />
                        </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary">Weekly off days inside the range are not counted as leave in reports.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button variant="outlined" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Leave'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Leave</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Delete {deleteTarget?.employee.fullName}'s {deleteTarget ? LEAVE_TYPE_LABELS[deleteTarget.leaveType].toLowerCase() : ''} leave
                        ({deleteTarget && formatDateKey(deleteTarget.startDate)} to {deleteTarget && formatDateKey(deleteTarget.endDate)})?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeavesPanel;
