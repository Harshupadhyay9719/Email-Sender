import { Router, Request, Response } from 'express';
import { ConnectedAccount } from '../models/index';
import GmailService from '../services/email/GmailService';
import AuthService from '../services/auth/AuthService';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/test/gmail-send
 * Body: { "to": "recipient@gmail.com" }
 * Sends a test email using the connected Gmail account.
 */
router.post('/gmail-send', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email "to" is required',
      });
    }

    // Try to retrieve user ID from Authorization header optionally
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = AuthService.verifyAccessToken(token);
        userId = decoded.userId;
      } catch (err) {
        logger.warn('[TestGmailSend] Failed to verify optional token:', err);
      }
    }

    let connectedAccount;
    if (userId) {
      connectedAccount = await ConnectedAccount.findOne({
        userId,
        provider: 'google',
      });
    }

    // Fallback: load the first connected Google account in the database
    if (!connectedAccount) {
      connectedAccount = await ConnectedAccount.findOne({
        provider: 'google',
      });
    }

    if (!connectedAccount || !connectedAccount.email) {
      return res.status(404).json({
        success: false,
        message: 'No connected Gmail account found in the database. Please connect an account first.',
      });
    }

    logger.info(`[TestGmailSend] Sending test email to ${to} via connected Gmail account: ${connectedAccount.email}`);

    const result = await GmailService.sendEmail(
      connectedAccount.userId.toString(),
      connectedAccount.email,
      {
        to,
        from: connectedAccount.email,
        subject: 'Test Email via Gmail API',
        htmlBody: `<h3>Hello!</h3><p>This is a test email sent from the connected Gmail account <b>${connectedAccount.email}</b> using the Gmail API integration.</p>`,
        textBody: `Hello! This is a test email sent from the connected Gmail account ${connectedAccount.email} using the Gmail API integration.`,
      }
    );

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${to} via Gmail API (${connectedAccount.email})`,
      messageId: result.MessageId,
      gmailMessageId: result.gmailMessageId,
      threadId: result.threadId,
    });
  } catch (error: any) {
    logger.error('[TestGmailSend] Error sending test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

export default router;
