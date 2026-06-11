"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_ses_1 = require("@aws-sdk/client-ses");
const env_1 = __importDefault(require("../../config/env"));
const logger_1 = __importDefault(require("../../utils/logger"));
class SESService {
    constructor() {
        this.client = new client_ses_1.SESClient({
            region: env_1.default.aws_region,
            credentials: env_1.default.aws_access_key_id && env_1.default.aws_secret_access_key
                ? {
                    accessKeyId: env_1.default.aws_access_key_id,
                    secretAccessKey: env_1.default.aws_secret_access_key,
                }
                : undefined,
        });
    }
    async sendEmail(input) {
        if (!this.isConfigured() && env_1.default.node_env !== 'production') {
            logger_1.default.warn(`AWS SES credentials not configured. Dry-run email accepted for ${input.to}.`);
            return {
                $metadata: { httpStatusCode: 200 },
                MessageId: `dry-run-${Date.now()}`,
            };
        }
        const params = {
            Source: input.from || env_1.default.aws_ses_from_email,
            Destination: {
                ToAddresses: [input.to],
            },
            ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
            Message: {
                Subject: {
                    Charset: 'UTF-8',
                    Data: input.subject,
                },
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: input.htmlBody,
                    },
                    Text: input.textBody
                        ? {
                            Charset: 'UTF-8',
                            Data: input.textBody,
                        }
                        : undefined,
                },
            },
        };
        return this.client.send(new client_ses_1.SendEmailCommand(params));
    }
    isConfigured() {
        return Boolean(env_1.default.aws_access_key_id && env_1.default.aws_secret_access_key);
    }
}
exports.default = new SESService();
//# sourceMappingURL=SESService.js.map