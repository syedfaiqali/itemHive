import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { createNote, deleteNote, getNotes, updateNote } from '../controllers/notesController';
import { noteCreateSchema, noteUpdateSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('admin', 'cashier'), getNotes);
router.post('/', protect, authorize('admin', 'cashier'), validate(noteCreateSchema), createNote);
router.patch('/:id', protect, authorize('admin', 'cashier'), validate(noteUpdateSchema), updateNote);
router.delete('/:id', protect, authorize('admin', 'cashier'), deleteNote);

export default router;
