import { EmailValidationStatus } from '../../types/index';
export interface EmailValidationResult {
    email: string;
    status: EmailValidationStatus;
    reason?: string;
    validatedAt: Date;
}
declare class EmailValidationService {
    validateEmail(email: string): Promise<EmailValidationResult>;
    validateOrganizationContacts(organizationId: string): Promise<EmailValidationResult[]>;
    private mapFailureToStatus;
    private formatReason;
}
declare const _default: EmailValidationService;
export default _default;
//# sourceMappingURL=EmailValidationService.d.ts.map