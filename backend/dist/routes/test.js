"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../models/index");
const GmailService_1 = __importDefault(require("../services/email/GmailService"));
const AuthService_1 = __importDefault(require("../services/auth/AuthService"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * POST /api/v1/test/gmail-send
 * Body: { "to": "recipient@gmail.com" }
 * Sends a test email using the connected Gmail account.
 */
router.post('/gmail-send', async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email "to" is required',
            });
        }
        // Try to retrieve user ID from Authorization header optionally
        let userId;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = AuthService_1.default.verifyAccessToken(token);
                userId = decoded.userId;
            }
            catch (err) {
                logger_1.default.warn('[TestGmailSend] Failed to verify optional token:', err);
            }
        }
        let connectedAccount;
        if (userId) {
            connectedAccount = await index_1.ConnectedAccount.findOne({
                userId,
                provider: 'google',
            });
        }
        // Fallback: load the first connected Google account in the database
        if (!connectedAccount) {
            connectedAccount = await index_1.ConnectedAccount.findOne({
                provider: 'google',
            });
        }
        if (!connectedAccount || !connectedAccount.email) {
            return res.status(404).json({
                success: false,
                message: 'No connected Gmail account found in the database. Please connect an account first.',
            });
        }
        logger_1.default.info(`[TestGmailSend] Sending test email to ${to} via connected Gmail account: ${connectedAccount.email}`);
        // Try to load user's name
        const user = await index_1.User.findById(connectedAccount.userId);
        const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
        const fromHeader = displayName
            ? `"${displayName.replace(/"/g, '\\"')}" <${connectedAccount.email}>`
            : connectedAccount.email;
        const result = await GmailService_1.default.sendEmail(connectedAccount.userId.toString(), connectedAccount.email, {
            to,
            from: fromHeader,
            subject: 'Test Email via Gmail API',
            htmlBody: `<h3>Hello!</h3><p>This is a test email sent from the connected Gmail account <b>${connectedAccount.email}</b> using the Gmail API integration.</p>`,
            textBody: `Hello! This is a test email sent from the connected Gmail account ${connectedAccount.email} using the Gmail API integration.`,
        });
        return res.status(200).json({
            success: true,
            message: `Test email sent successfully to ${to} via Gmail API (${connectedAccount.email})`,
            messageId: result.MessageId,
            gmailMessageId: result.gmailMessageId,
            threadId: result.threadId,
        });
    }
    catch (error) {
        logger_1.default.error('[TestGmailSend] Error sending test email:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message,
        });
    }
});
exports.default = router;
