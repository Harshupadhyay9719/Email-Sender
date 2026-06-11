"use strict";
/**
 * Authentication Controller
 * Handles user registration, login, and token refresh
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = __importDefault(require("../services/auth/AuthService"));
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    /**
     * POST /auth/register
     * Register a new user
     */
    static async register(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;
            // Validate required fields
            if (!email || !password || !firstName || !lastName) {
                throw new errors_1.ValidationError('Email, password, firstName, and lastName are required');
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new errors_1.ValidationError('Invalid email format');
            }
            const result = await AuthService_1.default.register(email, password, firstName, lastName);
            responseHandler_1.ResponseHandler.created(res, result, 'User registered successfully');
        }
        catch (error) {
            logger_1.default.error('Registration error:', error);
            next(error);
        }
    }
    /**
     * POST /auth/login
     * Login user with email and password
     */
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            // Validate required fields
            if (!email || !password) {
                throw new errors_1.ValidationError('Email and password are required');
            }
            const result = await AuthService_1.default.login(email, password);
            responseHandler_1.ResponseHandler.success(res, 200, 'Login successful', result);
        }
        catch (error) {
            logger_1.default.error('Login error:', error);
            next(error);
        }
    }
    /**
     * POST /auth/refresh
     * Refresh access token
     */
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw new errors_1.ValidationError('Refresh token is required');
            }
            const result = await AuthService_1.default.refreshAccessToken(refreshToken);
            responseHandler_1.ResponseHandler.success(res, 200, 'Token refreshed', result);
        }
        catch (error) {
            logger_1.default.error('Token refresh error:', error);
            next(error);
        }
    }
    /**
     * POST /auth/verify
     * Verify current user session
     */
    static async verify(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.ValidationError('User not authenticated');
            }
            const user = await AuthService_1.default.verifyUser(req.user.userId);
            responseHandler_1.ResponseHandler.success(res, 200, 'User verified', { user });
        }
        catch (error) {
            logger_1.default.error('User verification error:', error);
            next(error);
        }
    }
    /**
     * POST /auth/logout
     * Logout user (frontend-handled, backend just confirms)
     */
    static logout(req, res) {
        responseHandler_1.ResponseHandler.success(res, 200, 'Logged out successfully', null);
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map