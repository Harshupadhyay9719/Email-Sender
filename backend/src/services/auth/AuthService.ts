/**
 * Authentication Service
 * Handles JWT token generation, password hashing, and user authentication
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../config/env';
import { User } from '../../models/index';
import { JwtPayload, UserInterface } from '../../types/index';
import { AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../../utils/errors';
import logger from '../../utils/logger';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<UserInterface>;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error comparing passwords:', error);
      return false;
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role: role as any,
    };

    const options: jwt.SignOptions = {
      expiresIn: config.jwt_expires_in as jwt.SignOptions['expiresIn'],
      issuer: 'email-campaign-platform',
      subject: userId,
    };

    return jwt.sign(payload, config.jwt_secret, options);
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string): string {
    const options: jwt.SignOptions = {
      expiresIn: config.jwt_refresh_expires_in as jwt.SignOptions['expiresIn'],
      issuer: 'email-campaign-platform',
      subject: userId,
    };

    return jwt.sign({ userId }, config.jwt_refresh_secret, options);
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt_secret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, config.jwt_refresh_secret) as { userId: string };
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create new user
      const user = new User({
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
      logger.info(`User registered: ${user.email}`);

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
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user and get password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+hashedPassword');

      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Compare passwords
      const isPasswordValid = await this.comparePassword(password, user.hashedPassword);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

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
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      const accessToken = this.generateAccessToken(user._id.toString(), user.email, user.role);

      return { accessToken };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Verify user token and return user data
   */
  async verifyUser(userId: string): Promise<UserInterface> {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new NotFoundError('User');
      }

      return user.toObject();
    } catch (error) {
      logger.error('User verification error:', error);
      throw error;
    }
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any): Partial<UserInterface> {
    const { hashedPassword, ...rest } = user;
    return rest;
  }
}

export default new AuthService();
