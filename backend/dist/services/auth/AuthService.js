"use strict";
/**
 * Authentication Service
 * Handles JWT token generation, password hashing, and user authentication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = __importDefault(require("../../config/env"));
const index_1 = require("../../models/index");
const errors_1 = require("../../utils/errors");
const logger_1 = __importDefault(require("../../utils/logger"));
class AuthService {
    /**
     * Hash password using bcrypt
     */
    async hashPassword(password) {
        try {
            const saltRounds = 12;
            return await bcryptjs_1.default.hash(password, saltRounds);
        }
        catch (error) {
            logger_1.default.error('Error hashing password:', error);
            throw new Error('Failed to hash password');
        }
    }
    /**
     * Compare password with hash
     */
    async comparePassword(password, hash) {
        try {
            return await bcryptjs_1.default.compare(password, hash);
        }
        catch (error) {
            logger_1.default.error('Error comparing passwords:', error);
            return false;
        }
    }
    /**
     * Generate JWT access token
     */
    generateAccessToken(userId, email, role) {
        const payload = {
            userId,
            email,
            role: role,
        };
        const options = {
            expiresIn: env_1.default.jwt_expires_in,
            issuer: 'email-campaign-platform',
            subject: userId,
        };
        return jsonwebtoken_1.default.sign(payload, env_1.default.jwt_secret, options);
    }
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken(userId) {
        const options = {
            expiresIn: env_1.default.jwt_refresh_expires_in,
            issuer: 'email-campaign-platform',
            subject: userId,
        };
        return jsonwebtoken_1.default.sign({ userId }, env_1.default.jwt_refresh_secret, options);
    }
    /**
     * Verify JWT token
     */
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, env_1.default.jwt_secret);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new errors_1.AuthenticationError('Token has expired');
            }
            throw new errors_1.AuthenticationError('Invalid token');
        }
    }
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, env_1.default.jwt_refresh_secret);
        }
        catch (error) {
            throw new errors_1.AuthenticationError('Invalid refresh token');
        }
    }
    /**
     * Register a new user
     */
    async register(email, password, firstName, lastName) {
        try {
            // Check if user already exists
            const existingUser = await index_1.User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                throw new errors_1.ConflictError('Email already registered');
            }
            // Validate password strength
            if (password.length < 8) {
                throw new errors_1.ValidationError('Password must be at least 8 characters long');
            }
            // Hash password
            const hashedPassword = await this.hashPassword(password);
            // Create new user
            const user = new index_1.User({
                email: email.toLowerCase(),
                hashedPassword,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: 'Operator',
                isActive: true,
                preferences: {
                    theme: 'light',
                    emailNotifications: true,
                    emailLanguage: 'en',
                },
            });
            await user.save();
            logger_1.default.info(`User registered: ${user.email}`);
            // Generate tokens
            const accessToken = this.generateAccessToken(user._id.toString(), user.email, user.role);
            const refreshToken = this.generateRefreshToken(user._id.toString());
            // Return response without password
            const userResponse = this.sanitizeUser(user.toObject());
            return {
                user: userResponse,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            logger_1.default.error('Registration error:', error);
            throw error;
        }
    }
    /**
     * Login user
     */
    async login(email, password) {
        try {
            // Find user and get password field
            const user = await index_1.User.findOne({ email: email.toLowerCase() }).select('+hashedPassword');
            if (!user || !user.isActive) {
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            // Compare passwords
            const isPasswordValid = await this.comparePassword(password, user.hashedPassword);
            if (!isPasswordValid) {
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            logger_1.default.info(`User logged in: ${user.email}`);
            // Generate tokens
            const accessToken = this.generateAccessToken(user._id.toString(), user.email, user.role);
            const refreshToken = this.generateRefreshToken(user._id.toString());
            // Return response without password
            const userResponse = this.sanitizeUser(user.toObject());
            return {
                user: userResponse,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            logger_1.default.error('Login error:', error);
            throw error;
        }
    }
    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);
            const user = await index_1.User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new errors_1.AuthenticationError('User not found or inactive');
            }
            const accessToken = this.generateAccessToken(user._id.toString(), user.email, user.role);
            return { accessToken };
        }
        catch (error) {
            logger_1.default.error('Refresh token error:', error);
            throw error;
        }
    }
    /**
     * Verify user token and return user data
     */
    async verifyUser(userId) {
        try {
            const user = await index_1.User.findById(userId);
            if (!user || !user.isActive) {
                throw new errors_1.NotFoundError('User');
            }
            return user.toObject();
        }
        catch (error) {
            logger_1.default.error('User verification error:', error);
            throw error;
        }
    }
    /**
     * Remove sensitive fields from user object
     */
    sanitizeUser(user) {
        const { hashedPassword, ...rest } = user;
        return rest;
    }
}
exports.default = new AuthService();
//# sourceMappingURL=AuthService.js.map