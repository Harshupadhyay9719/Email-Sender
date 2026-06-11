/**
 * Authentication Service
 * Handles JWT token generation, password hashing, and user authentication
 */
import { JwtPayload, UserInterface } from '../../types/index';
export interface AuthCredentials {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: Partial<UserInterface>;
    accessToken: string;
    refreshToken: string;
}
declare class AuthService {
    /**
     * Hash password using bcrypt
     */
    hashPassword(password: string): Promise<string>;
    /**
     * Compare password with hash
     */
    comparePassword(password: string, hash: string): Promise<boolean>;
    /**
     * Generate JWT access token
     */
    generateAccessToken(userId: string, email: string, role: string): string;
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken(userId: string): string;
    /**
     * Verify JWT token
     */
    verifyAccessToken(token: string): JwtPayload;
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): {
        userId: string;
    };
    /**
     * Register a new user
     */
    register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse>;
    /**
     * Login user
     */
    login(email: string, password: string): Promise<AuthResponse>;
    /**
     * Refresh access token
     */
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    /**
     * Verify user token and return user data
     */
    verifyUser(userId: string): Promise<UserInterface>;
    /**
     * Remove sensitive fields from user object
     */
    private sanitizeUser;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=AuthService.d.ts.map