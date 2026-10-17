import { Router } from 'express';
import {
  listTeam,
  getTeamMember,
  createTeamMember,
  updateTeamMemberHandler,
  deleteTeamMemberHandler,
} from '../controllers/teamController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listTeam);
router.post('/', requireAuth, createTeamMember);
router.get('/:id', requireAuth, getTeamMember);
router.put('/:id', requireAuth, updateTeamMemberHandler);
router.delete('/:id', requireAuth, deleteTeamMemberHandler);

export { router };
export default router;
