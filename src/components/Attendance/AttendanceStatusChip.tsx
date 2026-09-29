import React from 'react';
import { Chip } from '@mui/material';
import { ATTENDANCE_STATUS_META } from '../../lib/employees';
import type { AttendanceDayStatus } from '../../types/employee';

const AttendanceStatusChip: React.FC<{ status: AttendanceDayStatus }> = ({ status }) => {
    const meta = ATTENDANCE_STATUS_META[status];
    return <Chip size="small" color={meta.color} variant={meta.variant} label={meta.label} sx={{ fontWeight: 700 }} />;
};

export default AttendanceStatusChip;
