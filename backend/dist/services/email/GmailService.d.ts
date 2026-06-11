export interface SendEmailInput {
    to: string;
    from: string;
    replyTo?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    attachments?: any[];
}
declare class GmailService {
    /**
     * Get an OAuth2 client configured with environment credentials
     */
    getOAuth2Client(): import("googleapis-common").OAuth2Client;
    /**
     * Generate Auth URL for consent screen
     */
    getAuthUrl(state: string): string;
    verifyGmailSendScope(connectedAccount: any): Promise<string[]>;
    /**
     * Connect and save Google account using authorization code
     */
    connectAccount(userId: string, code: string): Promise<any>;
    /**
     * Refresh and retrieve a valid access token for a connected account
     */
    refreshAccessToken(connectedAccount: any): Promise<string>;
    /**
     * Send an email through the Gmail API
     */
    sendEmail(userId: string, senderEmail: string, emailData: SendEmailInput): Promise<{
        MessageId: string;
        gmailMessageId?: string;
        threadId?: string;
    }>;
    /**
     * Disconnect Google account and remove it from database
     */
    disconnectAccount(userId: string, email: string): Promise<boolean>;
    /**
     * Construct raw MIME email string
     */
    private buildMimeEmail;
}
declare const _default: GmailService;
export default _default;
//# sourceMappingURL=GmailService.d.ts.map