import { Router } from 'express';
import {
  listLeaves,
  createLeave,
  deleteLeaveHandler,
} from '../controllers/teamController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listLeaves);
router.post('/', requireAuth, createLeave);
router.delete('/:id', requireAuth, deleteLeaveHandler);

export { router };
export default router;
