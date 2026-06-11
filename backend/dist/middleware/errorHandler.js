"use strict";
/**
 * Error Handling Middleware
 * Centralized error handling for all requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
const errorHandler = (err, req, res, next) => {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    if (err instanceof errors_1.AppError) {
        const statusCode = err.statusCode;
        const message = err.message;
        logger_1.default.error(`[${requestId}] ${statusCode} - ${message}`);
        const response = {
            success: false,
            statusCode,
            message,
            requestId,
            timestamp: new Date(),
        };
        // Include launch conflict properties if they exist
        if ('emailsQueued' in err) {
            response.emailsQueued = err.emailsQueued;
            response.emailsSent = err.emailsSent;
            response.campaignStatus = err.campaignStatus;
            response.reasonForBlock = err.reasonForBlock;
        }
        res.status(statusCode).json(response);
    }
    else {
        // Unexpected error
        logger_1.default.error(`[${requestId}] Unexpected error:`, err);
        const response = {
            success: false,
            statusCode: 500,
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            requestId,
            timestamp: new Date(),
        };
        res.status(500).json(response);
    }
};
exports.errorHandler = errorHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    const response = {
        success: false,
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId,
        timestamp: new Date(),
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map