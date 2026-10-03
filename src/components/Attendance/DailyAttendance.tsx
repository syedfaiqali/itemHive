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
import { Camera, ChevronLeft, ChevronRight, Edit3, Hand, RefreshCw, ScanFace, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../../api/axios';
import {
    browserTimeZone,
    formatDateKey,
    formatTime,
    formatWorkedMinutes,
    getInitials,
    toLocalDateKey,
    toTimeInputValue,
} from '../../lib/employees';
import AttendanceStatusChip from './AttendanceStatusChip';
import {
    LEAVE_TYPE_LABELS,
    type AttendanceDayStatus,
    type AttendanceMethod,
    type AttendanceRecord,
    type EmployeeSummary,
    type LeaveType,
} from '../../types/employee';

interface DailyRow {
    employee: EmployeeSummary;
    record: AttendanceRecord | null;
    leave: { _id: string; leaveType: LeaveType; reason: string; startDate: string; endDate: string } | null;
    status: AttendanceDayStatus;
}

interface DailyResponse {
    date: string;
    today: string;
    rows: DailyRow[];
}

interface EditState {
    row: DailyRow;
    checkIn: string;
    checkOut: string;
    note: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as AxiosError<{ message?: string }>).response?.data?.message || fallback;

const shiftDateKey = (dateKey: string, days: number) => {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toLocalDateKey(date);
};

/** Builds the timestamp for a HH:mm on a date; a check-out earlier than check-in belongs to the next day. */
const toTimestamp = (dateKey: string, time: string, nextDay = false) => {
    const date = new Date(`${dateKey}T${time}:00`);
    if (nextDay) date.setDate(date.getDate() + 1);
    return date.toISOString();
};

const MethodIcon: React.FC<{ method: AttendanceMethod | null }> = ({ method }) => method ? (
    <Tooltip title={method === 'face' ? 'Face scan' : 'Entered manually'}>
        <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', ml: 0.75, verticalAlign: 'middle' }}>
            {method === 'face' ? <ScanFace size={14} /> : <Hand size={14} />}
        </Box>
    </Tooltip>
) : null;

const DailyAttendance: React.FC = () => {
    const [date, setDate] = React.useState(() => toLocalDateKey());
    const [data, setData] = React.useState<DailyResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [edit, setEdit] = React.useState<EditState | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<DailyRow | null>(null);
    const [photos, setPhotos] = React.useState<{ row: DailyRow; checkInPhoto: string; checkOutPhoto: string } | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<DailyResponse>('/attendance/daily', { params: { date, timeZone: browserTimeZone() } });
            setData(response.data);
        } catch (fetchError: unknown) {
            setError(getErrorMessage(fetchError, 'Unable to load attendance.'));
        } finally {
            setLoading(false);
        }
    }, [date]);

    React.useEffect(() => {
        load();
    }, [load]);

    const counts = React.useMemo(() => {
        const rows = data?.rows || [];
        return {
            present: rows.filter((row) => row.status === 'present').length,
            absent: rows.filter((row) => row.status === 'absent').length,
            leave: rows.filter((row) => row.status === 'leave').length,
            off: rows.filter((row) => row.status === 'off').length,
            stillIn: rows.filter((row) => row.record?.checkIn && !row.record.checkOut).length,
        };
    }, [data]);

    const openEdit = (row: DailyRow) => setEdit({
        row,
        checkIn: toTimeInputValue(row.record?.checkIn),
        checkOut: toTimeInputValue(row.record?.checkOut),
        note: row.record?.note || '',
    });

    const checkOutNextDay = Boolean(edit?.checkIn && edit.checkOut && edit.checkOut <= edit.checkIn);

    const handleSaveEdit = async () => {
        if (!edit) return;
        if (!edit.checkIn && !edit.checkOut) {
            setError('Enter a check-in or check-out time.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.put('/attendance/records', {
                employeeId: edit.row.employee._id,
                dateKey: date,
                checkIn: edit.checkIn ? toTimestamp(date, edit.checkIn) : null,
                checkOut: edit.checkOut ? toTimestamp(date, edit.checkOut, checkOutNextDay) : null,
                note: edit.note.trim(),
                timeZone: browserTimeZone(),
            });
            setEdit(null);
            await load();
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError, 'Unable to save attendance.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget?.record) return;
        setSaving(true);
        setError('');
        try {
            await api.delete(`/attendance/records/${deleteTarget.record._id}`);
            setDeleteTarget(null);
            await load();
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError, 'Unable to delete attendance.'));
        } finally {
            setSaving(false);
        }
    };

    const openPhotos = async (row: DailyRow) => {
        if (!row.record) return;
        try {
            const response = await api.get(`/attendance/records/${row.record._id}/photos`);
            setPhotos({ row, ...response.data });
        } catch (photoError: unknown) {
            setError(getErrorMessage(photoError, 'Unable to load scan photos.'));
        }
    };

    const isPast = Boolean(data && date < data.today);

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton onClick={() => setDate((current) => shiftDateKey(current, -1))}><ChevronLeft size={20} /></IconButton>
                    <TextField type="date" size="small" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
                    <IconButton onClick={() => setDate((current) => shiftDateKey(current, 1))}><ChevronRight size={20} /></IconButton>
                    <Button size="small" onClick={() => setDate(toLocalDateKey())}>Today</Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip color="success" label={`Present ${counts.present}`} />
                    <Chip color="error" label={`Absent ${counts.absent}`} />
                    <Chip color="info" label={`Leave ${counts.leave}`} />
                    <Chip label={`Off ${counts.off}`} />
                    {counts.stillIn > 0 && <Chip color="warning" variant="outlined" label={`${isPast ? 'No check-out' : 'Still in'} ${counts.stillIn}`} />}
                    <IconButton size="small" onClick={load} disabled={loading}><RefreshCw size={16} /></IconButton>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table sx={{ minWidth: 900 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>EMPLOYEE</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>CHECK IN</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>CHECK OUT</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>WORKED</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>NOTE</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!data || data.rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">{loading ? 'Loading attendance...' : 'No active employees. Add employees from the Employees screen.'}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : data.rows.map((row) => {
                            const hasFacePhoto = row.record?.checkInMethod === 'face' || row.record?.checkOutMethod === 'face';
                            return (
                                <TableRow key={row.employee._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar src={row.employee.photo || undefined} sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800, bgcolor: 'primary.main' }}>
                                                {getInitials(row.employee.fullName)}
                                            </Avatar>
                                            <Box>
                                                <Typography fontWeight={800}>{row.employee.fullName}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.employee.employeeCode}{row.employee.designation ? ` · ${row.employee.designation}` : ''}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <AttendanceStatusChip status={row.status} />
                                            {row.status === 'leave' && row.leave && <Typography variant="caption" color="text.secondary">{LEAVE_TYPE_LABELS[row.leave.leaveType]}</Typography>}
                                            {isPast && row.record?.checkIn && !row.record.checkOut && <Chip size="small" color="warning" variant="outlined" label="No check-out" />}
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {formatTime(row.record?.checkIn)}<MethodIcon method={row.record?.checkInMethod || null} />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {formatTime(row.record?.checkOut)}<MethodIcon method={row.record?.checkOutMethod || null} />
                                        {row.record?.checkOut && toLocalDateKey(new Date(row.record.checkOut)) !== date && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{formatDateKey(toLocalDateKey(new Date(row.record.checkOut)), { day: 'numeric', month: 'short' })}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{formatWorkedMinutes(row.record?.workedMinutes || 0)}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Typography variant="body2" color="text.secondary" noWrap>{row.record?.note || row.leave?.reason || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        {hasFacePhoto && (
                                            <Tooltip title="View scan photos">
                                                <IconButton size="small" onClick={() => openPhotos(row)}><Camera size={17} /></IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title={row.record ? 'Edit times' : 'Mark attendance manually'}>
                                            <IconButton size="small" color="primary" onClick={() => openEdit(row)}><Edit3 size={17} /></IconButton>
                                        </Tooltip>
                                        {row.record && (
                                            <Tooltip title="Delete attendance">
                                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><Trash2 size={17} /></IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={Boolean(edit)} onClose={() => setEdit(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {edit?.row.record ? 'Edit Attendance' : 'Mark Attendance'}
                    <Typography variant="body2" color="text.secondary">{edit?.row.employee.fullName} · {formatDateKey(date)}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={6}>
                            <TextField fullWidth type="time" label="Check In" InputLabelProps={{ shrink: true }} value={edit?.checkIn || ''} onChange={(event) => setEdit((current) => current && { ...current, checkIn: event.target.value })} />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                type="time"
                                label="Check Out"
                                InputLabelProps={{ shrink: true }}
                                value={edit?.checkOut || ''}
                                onChange={(event) => setEdit((current) => current && { ...current, checkOut: event.target.value })}
                                helperText={checkOutNextDay ? 'Next day' : ' '}
                            />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth label="Note" placeholder="Reason for the manual entry" value={edit?.note || ''} onChange={(event) => setEdit((current) => current && { ...current, note: event.target.value })} />
                        </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary">Clear a time to remove it. Times you change are marked as manual entries.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button variant="outlined" onClick={() => setEdit(null)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Attendance</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Delete {deleteTarget?.employee.fullName}'s attendance for {formatDateKey(date)}? The day will count as absent unless they are on leave.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(photos)} onClose={() => setPhotos(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Scan Photos · {photos?.row.employee.fullName}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {[
                            { label: `Check in · ${formatTime(photos?.row.record?.checkIn)}`, src: photos?.checkInPhoto },
                            { label: `Check out · ${formatTime(photos?.row.record?.checkOut)}`, src: photos?.checkOutPhoto },
                        ].map((photo) => (
                            <Grid key={photo.label} size={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">{photo.label}</Typography>
                                {photo.src ? (
                                    <Box component="img" src={photo.src} alt={photo.label} sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 2, mt: 0.5 }} />
                                ) : (
                                    <Box sx={{ width: '100%', aspectRatio: '1', borderRadius: 2, mt: 0.5, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">No photo</Typography>
                                    </Box>
                                )}
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setPhotos(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DailyAttendance;
