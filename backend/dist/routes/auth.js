"use strict";
/**
 * Authentication Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const GoogleAuthController_1 = require("../controllers/GoogleAuthController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', AuthController_1.AuthController.register);
router.post('/login', AuthController_1.AuthController.login);
router.post('/refresh', AuthController_1.AuthController.refresh);
// Google OAuth Redirect and Callback
router.post('/google/initiate', auth_1.authenticate, GoogleAuthController_1.GoogleAuthController.initiateGoogleAuth);
router.get('/google', GoogleAuthController_1.GoogleAuthController.redirectToGoogle);
router.get('/google/callback', GoogleAuthController_1.GoogleAuthController.handleCallback);
// Protected routes
router.post('/logout', auth_1.authenticate, AuthController_1.AuthController.logout);
router.post('/verify', auth_1.authenticate, AuthController_1.AuthController.verify);
// Protected Google OAuth Status & Disconnect & Scopes
router.get('/google/status', auth_1.authenticate, GoogleAuthController_1.GoogleAuthController.getConnectionStatus);
router.post('/google/disconnect', auth_1.authenticate, GoogleAuthController_1.GoogleAuthController.disconnectAccount);
router.get('/google/scopes', auth_1.authenticate, GoogleAuthController_1.GoogleAuthController.getTokenScopes);
exports.default = router;
//# sourceMappingURL=auth.js.map