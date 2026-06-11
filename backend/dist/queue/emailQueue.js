"use strict";
/**
 * Email Queue — Redis-free stub
 *
 * BullMQ / Redis have been removed from this project.
 * All email sending is handled directly via setTimeout in CampaignService.
 * This file exists only so that any legacy imports compile without errors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_QUEUE_NAME = void 0;
exports.getEmailQueue = getEmailQueue;
exports.closeEmailQueue = closeEmailQueue;
exports.buildEmailJobOptions = buildEmailJobOptions;
exports.checkRedisConnection = checkRedisConnection;
exports.EMAIL_QUEUE_NAME = 'email-send-queue';
// Stubs kept for compile-time compatibility — they do nothing at runtime.
function getEmailQueue() {
    throw new Error('Redis / BullMQ queue is not available — direct sending mode is active.');
}
async function closeEmailQueue() {
    // No-op: no queue to close
}
function buildEmailJobOptions() {
    return {};
}
/**
 * Always returns false — Redis is not available.
 */
async function checkRedisConnection() {
    return false;
}
//# sourceMappingURL=emailQueue.js.map