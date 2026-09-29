import React from 'react';
import { Box, Card, Tab, Tabs, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState } from '../../store';
import AttendanceKiosk from '../../components/Attendance/AttendanceKiosk';
import DailyAttendance from '../../components/Attendance/DailyAttendance';
import LeavesPanel from '../../components/Attendance/LeavesPanel';
import AttendanceReport from '../../components/Attendance/AttendanceReport';

type AttendanceTab = 'scan' | 'daily' | 'leaves' | 'report';

const TAB_LABELS: Record<AttendanceTab, string> = {
    scan: 'Face Check-in',
    daily: 'Daily Attendance',
    leaves: 'Leaves',
    report: 'Report',
};

const AttendancePage: React.FC = () => {
    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canManage = role === 'super_admin' || role === 'admin';
    const [searchParams, setSearchParams] = useSearchParams();

    // Users can run the scanner; reviewing and editing attendance is for admins.
    const tabs: AttendanceTab[] = canManage ? ['scan', 'daily', 'leaves', 'report'] : ['scan'];
    const requestedTab = searchParams.get('tab') as AttendanceTab | null;
    const tab = requestedTab && tabs.includes(requestedTab) ? requestedTab : 'scan';

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={800}>Attendance</Typography>
                <Typography variant="body2" color="text.secondary">
                    Employees scan their face to start and end the day. Review daily attendance, record leaves, and export reports.
                </Typography>
            </Box>

            <Card variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                {tabs.length > 1 && (
                    <Box sx={{ px: { xs: 1, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Tabs
                            value={tab}
                            onChange={(_, value: AttendanceTab) => setSearchParams(value === 'scan' ? {} : { tab: value }, { replace: true })}
                            variant="scrollable"
                            allowScrollButtonsMobile
                        >
                            {tabs.map((key) => <Tab key={key} value={key} label={TAB_LABELS[key]} sx={{ fontWeight: 800, minHeight: 58 }} />)}
                        </Tabs>
                    </Box>
                )}
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                    {/* Only the active tab is mounted, so the camera is released when leaving the scanner. */}
                    {tab === 'scan' && <AttendanceKiosk />}
                    {tab === 'daily' && <DailyAttendance />}
                    {tab === 'leaves' && <LeavesPanel />}
                    {tab === 'report' && <AttendanceReport />}
                </Box>
            </Card>
        </Box>
    );
};

export default AttendancePage;
