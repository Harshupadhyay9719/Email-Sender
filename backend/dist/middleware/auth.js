"use strict";
/**
 * Authentication Middleware
 * Validates JWT tokens and enforces role-based access control
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOperator = exports.requireAdmin = exports.authorize = exports.authenticate = void 0;
const AuthService_1 = __importDefault(require("../services/auth/AuthService"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Authenticate JWT token from request header
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.AuthenticationError('No token provided');
        }
        const token = authHeader.substring(7);
        const decoded = AuthService_1.default.verifyAccessToken(token);
        req.user = {
            ...decoded,
            userId: decoded.userId,
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        next(error);
    }
};
exports.authenticate = authenticate;
/**
 * Check if user has required role
 */
const authorize = (...allowedRoles) => (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('User not authenticated');
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new errors_1.AuthorizationError(`User role "${req.user.role}" is not authorized for this action`);
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Authorization error:', error);
        next(error);
    }
};
exports.authorize = authorize;
/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
    (0, exports.authorize)('Admin')(req, res, next);
};
exports.requireAdmin = requireAdmin;
/**
 * Require operator or admin role
 */
const requireOperator = (req, res, next) => {
    (0, exports.authorize)('Admin', 'Operator')(req, res, next);
};
exports.requireOperator = requireOperator;
