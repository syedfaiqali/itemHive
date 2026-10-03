import React from 'react';
import {
    alpha,
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
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
    useTheme,
} from '@mui/material';
import { Download, RefreshCw } from 'lucide-react';
import type { AxiosError } from 'axios';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import {
    ATTENDANCE_STATUS_META,
    browserTimeZone,
    formatDateKey,
    formatTime,
    formatWorkedMinutes,
    getInitials,
    startOfMonthKey,
    toLocalDateKey,
    WEEKDAY_LABELS,
    weekdayOfKey,
} from '../../lib/employees';
import AttendanceStatusChip from './AttendanceStatusChip';
import { LEAVE_TYPE_LABELS, type AttendanceDayStatus, type EmployeeSummary, type LeaveType } from '../../types/employee';

interface ReportDay {
    date: string;
    status: AttendanceDayStatus;
    checkIn: string | null;
    checkOut: string | null;
    workedMinutes: number;
    missingCheckOut: boolean;
    leaveType?: LeaveType;
}

interface ReportSummary {
    present: number;
    absent: number;
    leave: number;
    off: number;
    missingCheckOut: number;
    workedMinutes: number;
}

interface ReportRow {
    employee: EmployeeSummary;
    summary: ReportSummary;
    days: ReportDay[];
}

interface ReportResponse {
    from: string;
    to: string;
    today: string;
    weeklyOffDays: number[];
    days: string[];
    rows: ReportRow[];
}

const MAX_REPORT_DAYS = 93;

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as AxiosError<{ message?: string }>).response?.data?.message || fallback;

const attendanceRate = ({ present, absent, leave }: ReportSummary) => {
    const workingDays = present + absent + leave;
    return workingDays ? Math.round((present / workingDays) * 100) : null;
};

const describeDay = (day: ReportDay) => {
    const parts = [formatDateKey(day.date, { weekday: 'short', day: 'numeric', month: 'short' }), ATTENDANCE_STATUS_META[day.status].label];
    if (day.leaveType) parts.push(`${LEAVE_TYPE_LABELS[day.leaveType]} leave`);
    if (day.checkIn) parts.push(`In ${formatTime(day.checkIn)}`);
    if (day.checkOut) parts.push(`Out ${formatTime(day.checkOut)}`);
    if (day.missingCheckOut) parts.push('No check-out');
    return parts.join(' · ');
};

const exportReport = (report: ReportResponse) => {
    const workbook = XLSX.utils.book_new();

    const summaryRows = report.rows.map(({ employee, summary }) => ({
        Employee: employee.fullName,
        Code: employee.employeeCode,
        Designation: employee.designation,
        Present: summary.present,
        Absent: summary.absent,
        Leave: summary.leave,
        'Off Days': summary.off,
        'Missing Check-out': summary.missingCheckOut,
        'Worked Hours': Number((summary.workedMinutes / 60).toFixed(2)),
        'Attendance %': attendanceRate(summary) ?? '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    const register = [
        ['Employee', 'Code', ...report.days.map((day) => `${day.slice(8)} ${WEEKDAY_LABELS[weekdayOfKey(day)]}`)],
        ...report.rows.map((row) => [row.employee.fullName, row.employee.employeeCode, ...row.days.map((day) => ATTENDANCE_STATUS_META[day.status].short)]),
        [],
        ['P = Present, A = Absent, L = Leave, O = Off day'],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(register), 'Register');

    const dailyRows = report.rows.flatMap(({ employee, days }) => days
        .filter((day) => day.status !== 'upcoming' && day.status !== 'not_joined')
        .map((day) => ({
            Employee: employee.fullName,
            Code: employee.employeeCode,
            Date: day.date,
            Day: WEEKDAY_LABELS[weekdayOfKey(day.date)],
            Status: ATTENDANCE_STATUS_META[day.status].label,
            'Leave Type': day.leaveType ? LEAVE_TYPE_LABELS[day.leaveType] : '',
            'Check In': day.checkIn ? formatTime(day.checkIn) : '',
            'Check Out': day.checkOut ? formatTime(day.checkOut) : day.missingCheckOut ? 'Missing' : '',
            'Worked Hours': day.workedMinutes ? Number((day.workedMinutes / 60).toFixed(2)) : '',
        })));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), 'Daily Detail');

    XLSX.writeFile(workbook, `attendance_${report.from}_to_${report.to}.xlsx`);
};

const AttendanceReport: React.FC = () => {
    const theme = useTheme();
    const [from, setFrom] = React.useState(() => startOfMonthKey());
    const [to, setTo] = React.useState(() => toLocalDateKey());
    const [employeeId, setEmployeeId] = React.useState('all');
    const [employees, setEmployees] = React.useState<EmployeeSummary[]>([]);
    const [report, setReport] = React.useState<ReportResponse | null>(null);
    const [weeklyOffDays, setWeeklyOffDays] = React.useState<number[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        api.get('/attendance/employees')
            .then((response) => setEmployees(response.data || []))
            .catch(() => setEmployees([]));
    }, []);

    const load = React.useCallback(async () => {
        if (!from || !to) return;
        if (to < from) {
            setError('The end date cannot be before the start date.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.get<ReportResponse>('/attendance/report', {
                params: { from, to, timeZone: browserTimeZone(), ...(employeeId !== 'all' ? { employeeId } : {}) },
            });
            setReport(response.data);
            setWeeklyOffDays(response.data.weeklyOffDays);
        } catch (fetchError: unknown) {
            setError(getErrorMessage(fetchError, 'Unable to build the attendance report.'));
        } finally {
            setLoading(false);
        }
    }, [from, to, employeeId]);

    React.useEffect(() => {
        load();
    }, [load]);

    const toggleOffDay = async (weekday: number) => {
        const next = weeklyOffDays.includes(weekday)
            ? weeklyOffDays.filter((day) => day !== weekday)
            : [...weeklyOffDays, weekday].sort();
        if (next.length > 6) return;
        setWeeklyOffDays(next);
        try {
            await api.put('/attendance/settings', { weeklyOffDays: next });
            await load();
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError, 'Unable to save weekly off days.'));
        }
    };

    const statusColor = (status: AttendanceDayStatus) => {
        if (status === 'present') return theme.palette.success.main;
        if (status === 'absent') return theme.palette.error.main;
        if (status === 'leave') return theme.palette.info.main;
        if (status === 'off') return theme.palette.text.disabled;
        return 'transparent';
    };

    const singleRow = employeeId !== 'all' ? report?.rows[0] : undefined;

    return (
        <Box>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(event) => setFrom(event.target.value)} />
                    <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(event) => setTo(event.target.value)} />
                    <TextField select size="small" label="Employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} sx={{ minWidth: 220 }}>
                        <MenuItem value="all">All employees</MenuItem>
                        {employees.map((employee) => (
                            <MenuItem key={employee._id} value={employee._id}>{employee.fullName} ({employee.employeeCode})</MenuItem>
                        ))}
                    </TextField>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button color="inherit" startIcon={<RefreshCw size={16} />} onClick={load} disabled={loading}>Refresh</Button>
                    <Button variant="contained" startIcon={<Download size={16} />} onClick={() => report && exportReport(report)} disabled={!report || report.rows.length === 0}>
                        Export Excel
                    </Button>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">Weekly off days:</Typography>
                {WEEKDAY_LABELS.map((label, weekday) => (
                    <Chip
                        key={label}
                        size="small"
                        label={label}
                        color={weeklyOffDays.includes(weekday) ? 'primary' : 'default'}
                        variant={weeklyOffDays.includes(weekday) ? 'filled' : 'outlined'}
                        onClick={() => toggleOffDay(weekday)}
                    />
                ))}
                <Typography variant="caption" color="text.secondary">Off days are not counted as absent. Ranges can cover up to {MAX_REPORT_DAYS} days.</Typography>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Table size="small" sx={{ minWidth: 860 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>EMPLOYEE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>PRESENT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>ABSENT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>LEAVE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>OFF</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>NO CHECK-OUT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>HOURS</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>ATTENDANCE</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!report || report.rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">{loading ? 'Building report...' : 'No employees to report on.'}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : report.rows.map(({ employee, summary }) => {
                            const rate = attendanceRate(summary);
                            return (
                                <TableRow key={employee._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.25} alignItems="center">
                                            <Avatar src={employee.photo || undefined} sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: 'primary.main' }}>
                                                {getInitials(employee.fullName)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={800}>{employee.fullName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{employee.employeeCode}{employee.designation ? ` · ${employee.designation}` : ''}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800, color: 'success.main' }}>{summary.present}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800, color: 'error.main' }}>{summary.absent}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800, color: 'info.main' }}>{summary.leave}</TableCell>
                                    <TableCell align="center">{summary.off}</TableCell>
                                    <TableCell align="center" sx={{ color: summary.missingCheckOut ? 'warning.main' : undefined }}>{summary.missingCheckOut}</TableCell>
                                    <TableCell align="center">{formatWorkedMinutes(summary.workedMinutes)}</TableCell>
                                    <TableCell align="center">
                                        {rate === null ? '-' : (
                                            <Chip size="small" label={`${rate}%`} color={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'error'} sx={{ fontWeight: 800 }} />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {singleRow ? (
                <>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Day by day · {singleRow.employee.fullName}</Typography>
                    <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Table size="small" sx={{ minWidth: 640 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800 }}>DATE</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>CHECK IN</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>CHECK OUT</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>WORKED</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {singleRow.days.map((day) => (
                                    <TableRow key={day.date} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateKey(day.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <AttendanceStatusChip status={day.status} />
                                                {day.leaveType && <Typography variant="caption" color="text.secondary">{LEAVE_TYPE_LABELS[day.leaveType]}</Typography>}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{formatTime(day.checkIn)}</TableCell>
                                        <TableCell>
                                            {day.missingCheckOut ? <Chip size="small" color="warning" variant="outlined" label="Missing" /> : formatTime(day.checkOut)}
                                        </TableCell>
                                        <TableCell>{formatWorkedMinutes(day.workedMinutes)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            ) : report && report.rows.length > 0 && (
                <>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                        <Typography variant="h6" fontWeight={800}>Attendance register</Typography>
                        {(['present', 'absent', 'leave', 'off'] as const).map((status) => (
                            <Stack key={status} direction="row" spacing={0.5} alignItems="center">
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha(statusColor(status), 0.2), border: '1px solid', borderColor: statusColor(status) }} />
                                <Typography variant="caption" color="text.secondary">{ATTENDANCE_STATUS_META[status].short} = {ATTENDANCE_STATUS_META[status].label}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Table size="small" sx={{ '& td, & th': { px: 0.5 } }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', minWidth: 150, pl: '16px !important' }}>EMPLOYEE</TableCell>
                                    {report.days.map((day) => (
                                        <TableCell key={day} align="center" sx={{ minWidth: 28, lineHeight: 1.2 }}>
                                            <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }}>{Number(day.slice(8))}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{WEEKDAY_LABELS[weekdayOfKey(day)].slice(0, 2)}</Typography>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {report.rows.map((row) => (
                                    <TableRow key={row.employee._id} hover>
                                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', pl: '16px !important' }}>
                                            <Typography variant="body2" fontWeight={800} noWrap>{row.employee.fullName}</Typography>
                                        </TableCell>
                                        {row.days.map((day) => {
                                            const color = statusColor(day.status);
                                            return (
                                                <TableCell key={day.date} align="center">
                                                    <Tooltip title={describeDay(day)}>
                                                        <Box
                                                            sx={{
                                                                width: 22,
                                                                height: 22,
                                                                mx: 'auto',
                                                                borderRadius: 0.75,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 11,
                                                                fontWeight: 800,
                                                                color: color === 'transparent' ? 'text.disabled' : color,
                                                                bgcolor: color === 'transparent' ? 'transparent' : alpha(color, 0.15),
                                                                outline: day.missingCheckOut ? `2px solid ${theme.palette.warning.main}` : 'none',
                                                            }}
                                                        >
                                                            {ATTENDANCE_STATUS_META[day.status].short || '·'}
                                                        </Box>
                                                    </Tooltip>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Hover a day for check-in and check-out times. An orange outline means the employee did not check out.
                    </Typography>
                </>
            )}
        </Box>
    );
};

export default AttendanceReport;
