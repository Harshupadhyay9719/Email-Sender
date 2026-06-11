/**
 * Organization Service
 * Handles organization and contact management
 */
import { OrganizationInterface, EmailValidationStatus } from '../../types/index';
export interface CreateOrganizationInput {
    companyName: string;
    industry?: string;
    website?: string;
    contacts: Array<{
        name: string;
        email: string;
        phone?: string;
        position?: string;
        department?: string;
    }>;
}
export interface UpdateOrganizationInput {
    companyName?: string;
    industry?: string;
    website?: string;
}
export interface CreateContactInput {
    name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
}
declare class OrganizationService {
    /**
     * Create a new organization with contacts
     */
    createOrganization(userId: string, data: CreateOrganizationInput): Promise<OrganizationInterface>;
    /**
     * Get organization by ID
     */
    getOrganizationById(organizationId: string): Promise<OrganizationInterface>;
    /**
     * Get all organizations with pagination
     */
    getOrganizations(userId: string, page?: number, limit?: number, search?: string): Promise<{
        organizations: OrganizationInterface[];
        total: number;
    }>;
    /**
     * Update organization
     */
    updateOrganization(organizationId: string, data: UpdateOrganizationInput): Promise<OrganizationInterface>;
    /**
     * Delete organization
     */
    deleteOrganization(organizationId: string): Promise<void>;
    /**
     * Add contact to organization
     */
    addContact(organizationId: string, contactData: CreateContactInput): Promise<OrganizationInterface>;
    /**
     * Update contact in organization
     */
    updateContact(organizationId: string, contactId: string, contactData: Partial<CreateContactInput>): Promise<OrganizationInterface>;
    /**
     * Delete contact from organization
     */
    deleteContact(organizationId: string, contactId: string): Promise<OrganizationInterface>;
    /**
     * Validate all contacts in an organization and update their status
     */
    validateOrganizationContacts(organizationId: string, validationResults: Array<{
        email: string;
        status: EmailValidationStatus;
        reason?: string;
    }>): Promise<OrganizationInterface>;
}
declare const _default: OrganizationService;
export default _default;
//# sourceMappingURL=OrganizationService.d.ts.map