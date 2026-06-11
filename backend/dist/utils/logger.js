"use strict";
/**
 * Logger Utility
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = __importDefault(require("../config/env"));
class Logger {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
        };
        this.logLevel = this.levels[env_1.default.log_level] || this.levels.info;
    }
    formatTimestamp() {
        return new Date().toISOString();
    }
    shouldLog(level) {
        return this.levels[level] <= this.logLevel;
    }
    error(message, error) {
        if (this.shouldLog('error')) {
            console.error(`[${this.formatTimestamp()}] ERROR: ${message}`, error || '');
        }
    }
    warn(message, data) {
        if (this.shouldLog('warn')) {
            console.warn(`[${this.formatTimestamp()}] WARN: ${message}`, data || '');
        }
    }
    info(message, data) {
        if (this.shouldLog('info')) {
            console.log(`[${this.formatTimestamp()}] INFO: ${message}`, data || '');
        }
    }
    debug(message, data) {
        if (this.shouldLog('debug')) {
            console.log(`[${this.formatTimestamp()}] DEBUG: ${message}`, data || '');
        }
    }
}
exports.default = new Logger();
//# sourceMappingURL=logger.js.map