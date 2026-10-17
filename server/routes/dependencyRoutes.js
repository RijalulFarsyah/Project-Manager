import { Router } from 'express';
import {
  listDependencies,
  getDependency,
  createDependency,
  updateDependencyHandler,
  deleteDependencyHandler,
} from '../controllers/dependencyController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listDependencies);
router.post('/', requireAuth, createDependency);
router.get('/:id', requireAuth, getDependency);
router.put('/:id', requireAuth, updateDependencyHandler);
router.delete('/:id', requireAuth, deleteDependencyHandler);

export { router };
export default router;
