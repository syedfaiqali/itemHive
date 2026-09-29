import React from 'react';
import { alpha, Avatar, Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { CircleAlert, LogIn, LogOut, ScanFace, TimerReset } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../../api/axios';
import FaceCamera, { type FaceCameraTone } from './FaceCamera';
import { captureFaceSnapshot, type DetectedFace } from '../../lib/faceRecognition';
import { browserTimeZone, formatTime, formatWorkedMinutes, getInitials } from '../../lib/employees';
import type { AttendanceRecord, EmployeeSummary } from '../../types/employee';

type PunchAction = 'check_in' | 'check_out' | 'already_checked_in' | 'already_checked_out';

interface PunchResponse {
    action: PunchAction;
    employee: EmployeeSummary;
    record: AttendanceRecord | null;
}

interface ScanResult {
    id: number;
    tone: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    employee?: EmployeeSummary;
    action?: PunchAction;
    at: Date;
}

/** Consecutive good frames required before a scan, so a face passing by is not punched. */
const REQUIRED_STABLE_FRAMES = 2;
const MIN_SCAN_SCORE = 0.65;
const RESULT_HOLD_MS = 4000;
const ERROR_HOLD_MS = 2500;

const describePunch = ({ action, employee, record }: PunchResponse): Omit<ScanResult, 'id' | 'at'> => {
    const firstName = employee.fullName.split(' ')[0];
    switch (action) {
        case 'check_in':
            return { tone: 'success', action, employee, title: `Welcome, ${firstName}!`, message: `Checked in at ${formatTime(record?.checkIn)}` };
        case 'check_out':
            return {
                tone: 'info',
                action,
                employee,
                title: `Goodbye, ${firstName}!`,
                message: `Checked out at ${formatTime(record?.checkOut)} · worked ${formatWorkedMinutes(record?.workedMinutes || 0)}`,
            };
        case 'already_checked_in':
            return {
                tone: 'warning',
                action,
                employee,
                title: 'Already checked in',
                message: `${employee.fullName} checked in at ${formatTime(record?.checkIn)}. Scan again when leaving.`,
            };
        default:
            return {
                tone: 'warning',
                action,
                employee,
                title: 'Attendance complete',
                message: `${employee.fullName} already checked out at ${formatTime(record?.checkOut)}.`,
            };
    }
};

/** Short confirmation tone so staff do not have to watch the screen. */
const playTone = (ok: boolean) => {
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = ok ? 880 : 220;
        gain.gain.setValueAtTime(0.15, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.35);
        oscillator.onended = () => context.close();
    } catch {
        // Sound is optional.
    }
};

const AttendanceKiosk: React.FC = () => {
    const [result, setResult] = React.useState<ScanResult | null>(null);
    const [recent, setRecent] = React.useState<ScanResult[]>([]);
    const [hint, setHint] = React.useState('Look at the camera to check in or out.');
    const [paused, setPaused] = React.useState(false);
    const [now, setNow] = React.useState(() => new Date());
    const busyRef = React.useRef(false);
    const stableFramesRef = React.useRef(0);
    const resumeTimerRef = React.useRef<number | undefined>(undefined);
    const resultIdRef = React.useRef(0);

    React.useEffect(() => {
        const clock = window.setInterval(() => setNow(new Date()), 1000);
        return () => {
            window.clearInterval(clock);
            window.clearTimeout(resumeTimerRef.current);
        };
    }, []);

    const showResult = React.useCallback((next: Omit<ScanResult, 'id' | 'at'>) => {
        resultIdRef.current += 1;
        const entry: ScanResult = { ...next, id: resultIdRef.current, at: new Date() };
        setResult(entry);
        setHint(entry.tone === 'error' ? 'Try again in a moment...' : 'Next person in a moment...');
        if (entry.employee) setRecent((current) => [entry, ...current].slice(0, 8));
        playTone(entry.tone === 'success' || entry.tone === 'info');

        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = window.setTimeout(() => {
            busyRef.current = false;
            setResult(null);
            setPaused(false);
            setHint('Look at the camera to check in or out.');
        }, entry.tone === 'error' ? ERROR_HOLD_MS : RESULT_HOLD_MS);
    }, []);

    const handleDetect = React.useCallback(async (faces: DetectedFace[], video: HTMLVideoElement) => {
        if (busyRef.current) return;

        // With a queue behind the counter, the largest face is the person at the scanner.
        const [face] = faces;
        if (!face) {
            stableFramesRef.current = 0;
            setHint('Look at the camera to check in or out.');
            return;
        }
        if (!face.isCloseEnough) {
            stableFramesRef.current = 0;
            setHint('Please step closer to the camera.');
            return;
        }
        if (face.score < MIN_SCAN_SCORE) {
            stableFramesRef.current = 0;
            setHint('Hold still and face the camera.');
            return;
        }

        stableFramesRef.current += 1;
        if (stableFramesRef.current < REQUIRED_STABLE_FRAMES) {
            setHint('Hold still...');
            return;
        }

        stableFramesRef.current = 0;
        busyRef.current = true;
        setPaused(true);
        setHint('Recognizing...');

        try {
            const response = await api.post<PunchResponse>('/attendance/punch', {
                descriptor: face.descriptor,
                photo: captureFaceSnapshot(video, face.box),
                timeZone: browserTimeZone(),
            });
            showResult(describePunch(response.data));
        } catch (error: unknown) {
            const data = (error as AxiosError<{ message?: string; code?: string }>).response?.data;
            showResult(data?.code === 'FACE_NOT_RECOGNIZED'
                ? { tone: 'error', title: 'Face not recognized', message: 'Look straight at the camera and try again. If this keeps happening, ask a manager to register your face.' }
                : { tone: 'error', title: 'Could not mark attendance', message: data?.message || 'Please check the connection and try again.' });
        }
    }, [showResult]);

    const cameraTone: FaceCameraTone = result
        ? ({ success: 'success', info: 'success', warning: 'warning', error: 'error' } as const)[result.tone]
        : 'neutral';

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
                <FaceCamera
                    onDetect={handleDetect}
                    paused={paused}
                    tone={cameraTone}
                    overlay={(
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ScanFace size={18} />
                            <Typography fontWeight={700}>{hint}</Typography>
                        </Stack>
                    )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    The first scan of the day checks an employee in; the next scan checks them out. Face snapshots are saved with each record for review.
                </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={2.5}>
                    <Card sx={{ borderRadius: '8px', textAlign: 'center' }}>
                        <CardContent>
                            <Typography variant="h3" fontWeight={900} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Typography>
                            <Typography color="text.secondary" fontWeight={700}>
                                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            borderRadius: '8px',
                            minHeight: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s',
                            bgcolor: (theme) => (result ? alpha(theme.palette[result.tone].main, 0.12) : undefined),
                            border: '1px solid',
                            borderColor: (theme) => (result ? theme.palette[result.tone].main : theme.palette.divider),
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', width: '100%' }}>
                            {result ? (
                                <Stack spacing={1.5} alignItems="center">
                                    {result.employee ? (
                                        <Avatar src={result.employee.photo || undefined} sx={{ width: 88, height: 88, fontSize: 30, fontWeight: 800, bgcolor: `${result.tone}.main` }}>
                                            {getInitials(result.employee.fullName)}
                                        </Avatar>
                                    ) : (
                                        <Box sx={{ color: 'error.main' }}><CircleAlert size={56} /></Box>
                                    )}
                                    <Typography variant="h5" fontWeight={900}>{result.title}</Typography>
                                    {result.employee?.designation && <Chip size="small" label={result.employee.designation} />}
                                    <Typography color="text.secondary" fontWeight={600}>{result.message}</Typography>
                                </Stack>
                            ) : (
                                <Stack spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                                    <ScanFace size={48} />
                                    <Typography fontWeight={700}>Waiting for the next employee</Typography>
                                </Stack>
                            )}
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: '8px' }}>
                        <CardContent>
                            <Typography fontWeight={800} sx={{ mb: 1.5 }}>Recent scans on this device</Typography>
                            {recent.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No scans yet.</Typography>
                            ) : (
                                <Stack spacing={1.25}>
                                    {recent.map((entry) => (
                                        <Stack key={entry.id} direction="row" spacing={1.5} alignItems="center">
                                            <Avatar src={entry.employee?.photo || undefined} sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800 }}>
                                                {getInitials(entry.employee?.fullName || '')}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={800} noWrap>{entry.employee?.fullName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{entry.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                            </Box>
                                            {entry.action === 'check_in' && <Chip size="small" color="success" icon={<LogIn size={14} />} label="In" />}
                                            {entry.action === 'check_out' && <Chip size="small" color="info" icon={<LogOut size={14} />} label="Out" />}
                                            {(entry.action === 'already_checked_in' || entry.action === 'already_checked_out') && (
                                                <Chip size="small" color="warning" variant="outlined" icon={<TimerReset size={14} />} label="Repeat" />
                                            )}
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default AttendanceKiosk;
