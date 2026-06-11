import { EmailValidationStatus } from '../../types/index';
export interface DashboardMetrics {
    totalOrganizations: number;
    totalContacts: number;
    validContacts: number;
    invalidContacts: number;
    emailsSent: number;
    emailsDelivered: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsFailed: number;
    bounceRate: number;
    openRate: number;
    clickRate: number;
    companiesContacted: number;
    companiesRemaining: number;
    companiesWithNoValidContacts: number;
    campaignSuccessRate: number;
    dailySendCount: number;
    weeklySendCount: number;
    monthlySendCount: number;
}
declare class AnalyticsService {
    /**
     * Get main dashboard metrics
     */
    getDashboardMetrics(userId: string): Promise<DashboardMetrics>;
    /**
     * Get charts and analytical trends data
     */
    getChartsData(userId: string): Promise<{
        dailyActivity: {
            day: string;
            sent: number;
            opened: number;
            failed: number;
        }[];
        validationDistribution: {
            status: EmailValidationStatus;
            count: any;
        }[];
        campaignComparison: {
            name: string;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            failed: number;
        }[];
        sentVsFailed: {
            name: string;
            value: number;
        }[];
    }>;
}
declare const _default: AnalyticsService;
export default _default;
//# sourceMappingURL=AnalyticsService.d.ts.map