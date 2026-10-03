import { Router } from 'express';
import {
    clearEmployeeFace,
    createDesignation,
    createEmployee,
    deleteDesignation,
    deleteEmployee,
    deleteEmployeeDocument,
    getDesignations,
    getEmployee,
    getEmployeeDocument,
    getEmployees,
    setEmployeeFace,
    updateEmployee,
    uploadEmployeeDocument,
} from '../controllers/employeeController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';
import { designationSchema, employeeDocumentSchema, employeeFaceSchema, employeeSchema, validate } from '../middleware/validate';

const router = Router();
const manageEmployees = [protect, authorize('super_admin', 'admin'), requireScreenAccess('employees')];

router.get('/designations', ...manageEmployees, getDesignations);
router.post('/designations', ...manageEmployees, validate(designationSchema), createDesignation);
router.delete('/designations/:id', ...manageEmployees, deleteDesignation);

router.get('/', ...manageEmployees, getEmployees);
router.post('/', ...manageEmployees, validate(employeeSchema), createEmployee);
router.get('/:id', ...manageEmployees, getEmployee);
router.put('/:id', ...manageEmployees, validate(employeeSchema), updateEmployee);
router.delete('/:id', ...manageEmployees, deleteEmployee);

router.put('/:id/face', ...manageEmployees, validate(employeeFaceSchema), setEmployeeFace);
router.delete('/:id/face', ...manageEmployees, clearEmployeeFace);

router.post('/:id/documents', ...manageEmployees, validate(employeeDocumentSchema), uploadEmployeeDocument);
router.get('/:id/documents/:documentId', ...manageEmployees, getEmployeeDocument);
router.delete('/:id/documents/:documentId', ...manageEmployees, deleteEmployeeDocument);

export default router;
