"use strict";
/**
 * Express Server Setup
 * Main application configuration and middleware setup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const uuid_1 = require("uuid");
const env_1 = __importDefault(require("./config/env"));
const database_1 = __importDefault(require("./config/database"));
const index_1 = __importDefault(require("./routes/index"));
const errorHandler_1 = require("./middleware/errorHandler");
const emailWorker_1 = require("./queue/emailWorker");
const logger_1 = __importDefault(require("./utils/logger"));
class ExpressServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    /**
     * Setup middleware
     */
    setupMiddleware() {
        // Trust proxy
        this.app.set('trust proxy', 1);
        // Request ID middleware
        this.app.use((req, res, next) => {
            const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
            req.headers['x-request-id'] = requestId;
            res.setHeader('x-request-id', requestId);
            next();
        });
        // Logging middleware
        this.app.use((req, res, next) => {
            const requestId = req.headers['x-request-id'];
            logger_1.default.info(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);
            next();
        });
        // Body parser middleware
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
        // CORS middleware
        this.app.use((0, cors_1.default)({
            origin: env_1.default.cors_origin,
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        }));
        // Security middleware
        this.app.use((0, helmet_1.default)());
        // Additional security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });
    }
    /**
     * Setup API routes
     */
    setupRoutes() {
        const apiPrefix = `/api/${env_1.default.api_version}`;
        this.app.use(apiPrefix, index_1.default);
        // Root path handler
        this.app.get('/', (req, res) => {
            res.json({
                status: 'ok',
                message: 'Email Campaign API is running',
                version: env_1.default.api_version,
                health: '/api/health',
            });
        });
        // For backwards compatibility
        this.app.use('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date(),
                version: env_1.default.api_version,
            });
        });
    }
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use(errorHandler_1.notFoundHandler);
        // Global error handler (must be last)
        this.app.use(errorHandler_1.errorHandler);
    }
    /**
     * Start the server
     */
    async start() {
        try {
            // Connect to database
            await database_1.default.connect();
            (0, emailWorker_1.startEmailWorker)();
            // Start listening
            this.app.listen(env_1.default.port, () => {
                logger_1.default.info(`✓ Server running on port ${env_1.default.port}`);
                logger_1.default.info(`✓ Open in browser → http://localhost:${env_1.default.port}`);
                logger_1.default.info(`✓ API Base URL    → http://localhost:${env_1.default.port}/api/${env_1.default.api_version}`);
                logger_1.default.info(`✓ Health Check    → http://localhost:${env_1.default.port}/api/health`);
                logger_1.default.info(`✓ Environment: ${env_1.default.node_env}`);
                logger_1.default.info(`✓ API Version: ${env_1.default.api_version}`);
            });
        }
        catch (error) {
            logger_1.default.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    /**
     * Stop the server
     */
    async stop() {
        try {
            await (0, emailWorker_1.stopEmailWorker)();
            await database_1.default.disconnect();
            logger_1.default.info('✓ Server stopped');
        }
        catch (error) {
            logger_1.default.error('Error stopping server:', error);
            throw error;
        }
    }
    /**
     * Get Express app (useful for testing)
     */
    getApp() {
        return this.app;
    }
}
exports.default = ExpressServer;
//# sourceMappingURL=server.js.map