"use strict";
/**
 * Main Routes Aggregator
 * Combines all API routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const organizations_1 = __importDefault(require("./organizations"));
const campaigns_1 = __importDefault(require("./campaigns"));
const import_1 = __importDefault(require("./import"));
const analytics_1 = __importDefault(require("./analytics"));
const test_1 = __importDefault(require("./test"));
const env_1 = __importDefault(require("../config/env"));
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        version: env_1.default.api_version,
    });
});
// API routes
router.use('/auth', auth_1.default);
router.use('/organizations', organizations_1.default);
router.use('/campaigns', campaigns_1.default);
router.use('/import', import_1.default);
router.use('/analytics', analytics_1.default);
router.use('/test', test_1.default);
exports.default = router;
