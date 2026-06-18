import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply authentication and admin authorization globally to all admin routes
router.use(authenticate, requireAdmin);

router.get('/stats', AdminController.getDashboardStats);
router.get('/connected-accounts', AdminController.getConnectedAccounts);
router.delete('/connected-accounts/:accountId', AdminController.disconnectAccount);
router.get('/users', AdminController.getUsers);
router.patch('/users/:userId/status', AdminController.toggleUserStatus);
router.patch('/users/:userId/role', AdminController.updateUserRole);
router.get('/email-logs', AdminController.getSystemEmailLogs);

export default router;
