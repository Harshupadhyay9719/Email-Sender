"use strict";
/**
 * Application Entry Point
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const logger_1 = __importDefault(require("./utils/logger"));
const server = new server_1.default();
// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection:', { promise, reason });
    process.exit(1);
});
// Start server
server.start().catch((error) => {
    logger_1.default.error('Failed to start server:', error);
    process.exit(1);
});
exports.default = server;
//# sourceMappingURL=index.js.map