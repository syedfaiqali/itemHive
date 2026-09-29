import { Router } from 'express';
import {
    createLeave,
    deleteAttendanceRecord,
    deleteLeave,
    getAttendanceEmployees,
    getAttendanceRecordPhotos,
    getAttendanceReport,
    getAttendanceSettings,
    getDailyAttendance,
    getLeaves,
    punchAttendance,
    updateAttendanceSettings,
    upsertAttendanceRecord,
} from '../controllers/attendanceController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';
import {
    attendancePunchSchema,
    attendanceRecordSchema,
    attendanceSettingsSchema,
    employeeLeaveSchema,
    validate,
} from '../middleware/validate';

const router = Router();
const manageAttendance = [protect, authorize('super_admin', 'admin'), requireScreenAccess('attendance')];

// Users may run the face scanner at the counter; everything else is for admins.
router.post('/punch', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('attendance'), validate(attendancePunchSchema), punchAttendance);

router.get('/employees', ...manageAttendance, getAttendanceEmployees);
router.get('/daily', ...manageAttendance, getDailyAttendance);
router.put('/records', ...manageAttendance, validate(attendanceRecordSchema), upsertAttendanceRecord);
router.get('/records/:id/photos', ...manageAttendance, getAttendanceRecordPhotos);
router.delete('/records/:id', ...manageAttendance, deleteAttendanceRecord);

router.get('/leaves', ...manageAttendance, getLeaves);
router.post('/leaves', ...manageAttendance, validate(employeeLeaveSchema), createLeave);
router.delete('/leaves/:id', ...manageAttendance, deleteLeave);

router.get('/report', ...manageAttendance, getAttendanceReport);
router.get('/settings', ...manageAttendance, getAttendanceSettings);
router.put('/settings', ...manageAttendance, validate(attendanceSettingsSchema), updateAttendanceSettings);

export default router;
