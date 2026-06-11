import { SendEmailCommandOutput } from '@aws-sdk/client-ses';
export interface SendEmailInput {
    to: string;
    from: string;
    replyTo?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
}
declare class SESService {
    private client;
    constructor();
    sendEmail(input: SendEmailInput): Promise<SendEmailCommandOutput>;
    private isConfigured;
}
declare const _default: SESService;
export default _default;
//# sourceMappingURL=SESService.d.ts.map