import { google } from 'googleapis';
import { ConnectedAccount } from '../../models/index';
import { encrypt, decrypt } from '../../utils/encryption';
import config from '../../config/env';
export interface SendEmailInput {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: any[];
}
import logger from '../../utils/logger';

class GmailService {
  /**
   * Get an OAuth2 client configured with environment or custom credentials
   */
  getOAuth2Client(account?: any) {
    const clientId = account?.clientId ? decrypt(account.clientId) : config.google_client_id;
    const clientSecret = account?.clientSecret ? decrypt(account.clientSecret) : config.google_client_secret;
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      config.google_callback_url
    );
  }

  /**
   * Generate Auth URL for consent screen using custom credentials if provided
   */
  getAuthUrl(state: string, clientId?: string, clientSecret?: string): string {
    const oauth2Client = new google.auth.OAuth2(
      clientId || config.google_client_id,
      clientSecret || config.google_client_secret,
      config.google_callback_url
    );
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
    });
  }

  async verifyGmailSendScope(connectedAccount: any): Promise<string[]> {
    try {
      const oauth2Client = this.getOAuth2Client(connectedAccount);
      let accessToken = connectedAccount.accessToken;

      let tokenInfo;
      try {
        tokenInfo = await oauth2Client.getTokenInfo(accessToken);
      } catch (err: any) {
        // Token may be expired — refresh and retry
        logger.warn(`[ScopeCheck] Token info error for ${connectedAccount.email}: ${err.message}. Refreshing token...`);
        accessToken = await this.refreshAccessToken(connectedAccount);
        tokenInfo = await oauth2Client.getTokenInfo(accessToken);
      }

      const scopes = tokenInfo.scopes || [];
      logger.info(`[ScopeCheck] Active scopes for ${connectedAccount.email}: ${scopes.join(', ')}`);

      if (!scopes.includes('https://www.googleapis.com/auth/gmail.send')) {
        throw new Error(
          `Gmail account ${connectedAccount.email} was connected without the gmail.send permission. ` +
          `Please disconnect and reconnect your Gmail account to grant the required send permission.`
        );
      }

      return scopes;
    } catch (error: any) {
      logger.error(`[ScopeCheck] Failed to verify scopes for ${connectedAccount.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Connect and save Google account using authorization code
   */
  async connectAccount(userId: string, code: string): Promise<any> {
    try {
      const account = await ConnectedAccount.findOne({ userId, provider: 'google' });
      if (!account) {
        throw new Error('No connection initiation record found. Please start the connection flow again.');
      }

      const oauth2Client = this.getOAuth2Client(account);
      
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      if (!tokens.refresh_token) {
        // Check if there is already a saved account
        const existing = await ConnectedAccount.findOne({ userId, provider: 'google' });
        if (!existing || !existing.refreshToken) {
          throw new Error(
            'Failed to retrieve refresh token. Please revoke access in your Google Security settings and try again.'
          );
        }
        tokens.refresh_token = decrypt(existing.refreshToken);
      }

      // Fetch user profile info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;

      if (!email) {
        throw new Error('Could not fetch email from Google profile info');
      }

      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      // Update the connected account details
      account.email = email.toLowerCase();
      account.refreshToken = encryptedRefreshToken;
      account.accessToken = tokens.access_token || undefined;
      account.expiryDate = tokens.expiry_date || undefined;
      await account.save();

      logger.info(`✓ Successfully connected Gmail account: ${email} for user: ${userId}`);
      return account;
    } catch (error: any) {
      logger.error('Error connecting Gmail account:', error);
      throw error;
    }
  }

  /**
   * Refresh and retrieve a valid access token for a connected account
   */
  async refreshAccessToken(connectedAccount: any): Promise<string> {
    try {
      const oauth2Client = this.getOAuth2Client(connectedAccount);
      const decryptedRefreshToken = decrypt(connectedAccount.refreshToken);

      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      const response = await oauth2Client.getAccessToken();
      const accessToken = response.token;

      if (!accessToken) {
        throw new Error('Failed to retrieve new access token');
      }

      // Google returns expiry date in token request, if not calculate
      const expiryDate = Date.now() + 3500 * 1000;

      // Update in database
      connectedAccount.accessToken = accessToken;
      connectedAccount.expiryDate = expiryDate;
      await connectedAccount.save();

      return accessToken;
    } catch (error: any) {
      logger.error(`Error refreshing Google access token for account ${connectedAccount.email}:`, error);
      throw error;
    }
  }

  /**
   * Send an email through the Gmail API
   */
  async sendEmail(userId: string, senderEmail: string, emailData: SendEmailInput): Promise<{ MessageId: string; gmailMessageId?: string; threadId?: string; }> {
    logger.info(`[Email Send Start] Sending email to ${emailData.to} via Gmail API`);
    try {
      const account = await ConnectedAccount.findOne({
        userId,
        provider: 'google',
        email: senderEmail.toLowerCase(),
      });

      if (!account) {
        throw new Error(`No connected Gmail account found for user: ${userId} and email: ${senderEmail}`);
      }

      // Check if access token is expired or expiring soon (within 2 minutes)
      let accessToken = account.accessToken;
      if (!account.expiryDate || account.expiryDate < Date.now() + 120 * 1000) {
        logger.info(`Refreshing expired/expiring Gmail access token for ${senderEmail}`);
        accessToken = await this.refreshAccessToken(account);
      }

      // Verify that the token has gmail.send scope before attempting to send
      await this.verifyGmailSendScope(account);

      const oauth2Client = this.getOAuth2Client(account);
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Construct MIME Raw Email (RFC 822 format)
      const rawEmail = this.buildMimeEmail(emailData);
      
      // Base64Url encode raw email
      const encodedEmail = Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      logger.info(`[Email Send Success] Gmail API response: ${JSON.stringify(response.data)}`);
      logger.info(`✓ Email successfully sent via Gmail API. ID: ${response.data.id}`);

      return {
        MessageId: response.data.id || `gmail-${Date.now()}`,
        gmailMessageId: response.data.id || undefined,
        threadId: response.data.threadId || undefined,
      };
    } catch (error: any) {
      logger.error(`[Email Send Failed] Error: ${error.message}`);
      logger.error('Error sending email via Gmail API:', error);
      throw error;
    }
  }

  /**
   * Disconnect Google account and remove it from database
   */
  async disconnectAccount(userId: string, email: string): Promise<boolean> {
    try {
      const account = await ConnectedAccount.findOne({
        userId,
        provider: 'google',
        email: email.toLowerCase(),
      });

      if (!account) {
        throw new Error(`Google account not connected for email: ${email}`);
      }

      // Try revoking token from Google's servers
      try {
        if (!account.refreshToken) {
          throw new Error('Refresh token is missing');
        }
        const oauth2Client = this.getOAuth2Client(account);
        const refreshToken = decrypt(account.refreshToken);
        await oauth2Client.revokeToken(refreshToken);
        logger.info(`Google token revoked for email: ${email}`);
      } catch (revokeError: any) {
        logger.warn(`Failed to revoke token from Google servers: ${revokeError.message}`);
      }

      await ConnectedAccount.deleteOne({ _id: account._id });
      logger.info(`✓ Disconnected Gmail account: ${email} from database`);
      return true;
    } catch (error: any) {
      logger.error('Error disconnecting Gmail account:', error);
      throw error;
    }
  }

  /**
   * Construct raw MIME email string
   */
  private buildMimeEmail(input: SendEmailInput): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Clean headers and bodies
    const replyToHeader = input.replyTo ? `Reply-To: ${input.replyTo}\r\n` : '';
    const textBodyContent = input.textBody || '';
    const htmlBodyContent = input.htmlBody;

    // Construct raw MIME email body
    let raw = `From: ${input.from}\r\n` +
      `To: ${input.to}\r\n` +
      replyToHeader +
      `Subject: =?utf-8?B?${Buffer.from(input.subject).toString('base64')}?=\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${Buffer.from(textBodyContent).toString('base64')}\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${Buffer.from(htmlBodyContent).toString('base64')}\r\n\r\n` +
      `--${boundary}--`;

    return raw;
  }
}

export default new GmailService();
