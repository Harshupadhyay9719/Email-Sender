"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminController_1 = require("../controllers/AdminController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication and admin authorization globally to all admin routes
router.use(auth_1.authenticate, auth_1.requireAdmin);
router.get('/stats', AdminController_1.AdminController.getDashboardStats);
router.get('/connected-accounts', AdminController_1.AdminController.getConnectedAccounts);
router.delete('/connected-accounts/:accountId', AdminController_1.AdminController.disconnectAccount);
router.get('/users', AdminController_1.AdminController.getUsers);
router.patch('/users/:userId/status', AdminController_1.AdminController.toggleUserStatus);
router.patch('/users/:userId/role', AdminController_1.AdminController.updateUserRole);
router.get('/email-logs', AdminController_1.AdminController.getSystemEmailLogs);
exports.default = router;
