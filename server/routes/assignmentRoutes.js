import { Router } from 'express';
import {
  listAssignments,
  createAssignment,
  deleteAssignmentHandler,
} from '../controllers/assignmentController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listAssignments);
router.post('/', requireAuth, createAssignment);
router.delete('/:id', requireAuth, deleteAssignmentHandler);

export { router };
export default router;
