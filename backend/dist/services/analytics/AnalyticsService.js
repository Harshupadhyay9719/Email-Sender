"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("../../models/index");
const index_2 = require("../../types/index");
const logger_1 = __importDefault(require("../../utils/logger"));
class AnalyticsService {
    /**
     * Get main dashboard metrics
     */
    async getDashboardMetrics(userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            // 1. Total Organizations
            const totalOrganizations = await index_1.Organization.countDocuments({ createdBy: userObjectId });
            // 2. Contacts counts (total, valid, invalid)
            const contactStats = await index_1.Organization.aggregate([
                { $match: { createdBy: userObjectId } },
                { $unwind: '$contacts' },
                {
                    $group: {
                        _id: null,
                        totalContacts: { $sum: 1 },
                        validContacts: {
                            $sum: {
                                $cond: [{ $eq: ['$contacts.emailValidation.status', index_2.EmailValidationStatus.VALID] }, 1, 0],
                            },
                        },
                        invalidContacts: {
                            $sum: {
                                $cond: [{ $eq: ['$contacts.emailValidation.status', index_2.EmailValidationStatus.INVALID] }, 1, 0],
                            },
                        },
                    },
                },
            ]);
            const totalContacts = contactStats[0]?.totalContacts || 0;
            const validContacts = contactStats[0]?.validContacts || 0;
            const invalidContacts = contactStats[0]?.invalidContacts || 0;
            // 3. Campaign list & IDs to aggregate EmailLogs
            const campaigns = await index_1.Campaign.find({ createdBy: userObjectId }, { _id: 1 });
            const campaignIds = campaigns.map((c) => c._id);
            // 4. EmailLog metrics
            let emailsSent = 0;
            let emailsDelivered = 0;
            let emailsFailed = 0;
            let emailsBounced = 0;
            let emailsOpened = 0;
            let emailsClicked = 0;
            if (campaignIds.length > 0) {
                const emailStats = await index_1.EmailLog.aggregate([
                    { $match: { campaignId: { $in: campaignIds } } },
                    {
                        $group: {
                            _id: null,
                            sent: { $sum: { $cond: [{ $eq: ['$status', index_2.EmailStatus.SENT] }, 1, 0] } },
                            delivered: { $sum: { $cond: [{ $eq: ['$status', index_2.EmailStatus.DELIVERED] }, 1, 0] } },
                            failed: { $sum: { $cond: [{ $eq: ['$status', index_2.EmailStatus.FAILED] }, 1, 0] } },
                            bounced: { $sum: { $cond: [{ $eq: ['$status', index_2.EmailStatus.BOUNCED] }, 1, 0] } },
                            opened: { $sum: { $cond: [{ $gt: ['$tracking.openCount', 0] }, 1, 0] } },
                            clicked: { $sum: { $cond: [{ $gt: ['$tracking.clickCount', 0] }, 1, 0] } },
                        },
                    },
                ]);
                if (emailStats.length > 0) {
                    emailsSent = emailStats[0].sent || 0;
                    emailsDelivered = emailStats[0].delivered || 0;
                    emailsFailed = emailStats[0].failed || 0;
                    emailsBounced = emailStats[0].bounced || 0;
                    emailsOpened = emailStats[0].opened || 0;
                    emailsClicked = emailStats[0].clicked || 0;
                }
            }
            // Rates calculation
            const openRate = emailsSent > 0 ? parseFloat(((emailsOpened / emailsSent) * 100).toFixed(2)) : 0;
            const clickRate = emailsSent > 0 ? parseFloat(((emailsClicked / emailsSent) * 100).toFixed(2)) : 0;
            const bounceRate = emailsSent > 0 ? parseFloat(((emailsBounced / emailsSent) * 100).toFixed(2)) : 0;
            // 5. Companies contacted
            let contactedOrgs = [];
            if (campaignIds.length > 0) {
                contactedOrgs = await index_1.EmailLog.distinct('organizationId', {
                    campaignId: { $in: campaignIds },
                    status: { $in: [index_2.EmailStatus.SENT, index_2.EmailStatus.DELIVERED] },
                });
            }
            const companiesContacted = contactedOrgs.length;
            const companiesRemaining = Math.max(0, totalOrganizations - companiesContacted);
            // 6. Companies with no valid contacts
            const companiesWithNoValidContacts = await index_1.Organization.countDocuments({
                createdBy: userObjectId,
                'organizationStatus.allContactsInvalid': true,
            });
            // 7. Campaign success rate
            const totalCampaignCount = await index_1.Campaign.countDocuments({ createdBy: userObjectId });
            const completedCampaignCount = await index_1.Campaign.countDocuments({
                createdBy: userObjectId,
                'config.status': index_2.CampaignStatus.COMPLETED,
            });
            const campaignSuccessRate = totalCampaignCount > 0 ? parseFloat(((completedCampaignCount / totalCampaignCount) * 100).toFixed(2)) : 0;
            // 8. Timed sending statistics
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            let dailySendCount = 0;
            let weeklySendCount = 0;
            let monthlySendCount = 0;
            if (campaignIds.length > 0) {
                dailySendCount = await index_1.EmailLog.countDocuments({
                    campaignId: { $in: campaignIds },
                    status: index_2.EmailStatus.SENT,
                    'tracking.sentAt': { $gte: oneDayAgo },
                });
                weeklySendCount = await index_1.EmailLog.countDocuments({
                    campaignId: { $in: campaignIds },
                    status: index_2.EmailStatus.SENT,
                    'tracking.sentAt': { $gte: oneWeekAgo },
                });
                monthlySendCount = await index_1.EmailLog.countDocuments({
                    campaignId: { $in: campaignIds },
                    status: index_2.EmailStatus.SENT,
                    'tracking.sentAt': { $gte: oneMonthAgo },
                });
            }
            return {
                totalOrganizations,
                totalContacts,
                validContacts,
                invalidContacts,
                emailsSent,
                emailsDelivered,
                emailsOpened,
                emailsClicked,
                emailsFailed,
                bounceRate,
                openRate,
                clickRate,
                companiesContacted,
                companiesRemaining,
                companiesWithNoValidContacts,
                campaignSuccessRate,
                dailySendCount,
                weeklySendCount,
                monthlySendCount,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching dashboard metrics:', error);
            throw error;
        }
    }
    /**
     * Get charts and analytical trends data
     */
    async getChartsData(userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            const campaigns = await index_1.Campaign.find({ createdBy: userObjectId }, { _id: 1 });
            const campaignIds = campaigns.map((c) => c._id);
            // 1. Daily Email Activity (last 7 days)
            const dailyActivity = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const start = new Date(date.setHours(0, 0, 0, 0));
                const end = new Date(date.setHours(23, 59, 59, 999));
                let sent = 0;
                let opened = 0;
                let failed = 0;
                if (campaignIds.length > 0) {
                    sent = await index_1.EmailLog.countDocuments({
                        campaignId: { $in: campaignIds },
                        status: index_2.EmailStatus.SENT,
                        'tracking.sentAt': { $gte: start, $lte: end },
                    });
                    opened = await index_1.EmailLog.countDocuments({
                        campaignId: { $in: campaignIds },
                        'tracking.openedAt': { $gte: start, $lte: end },
                    });
                    failed = await index_1.EmailLog.countDocuments({
                        campaignId: { $in: campaignIds },
                        status: index_2.EmailStatus.FAILED,
                        'tracking.sentAt': { $gte: start, $lte: end },
                    });
                }
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                dailyActivity.push({
                    day: dayName,
                    sent,
                    opened,
                    failed,
                });
            }
            // 2. Validation Status Distribution
            const validationDist = await index_1.Organization.aggregate([
                { $match: { createdBy: userObjectId } },
                { $unwind: '$contacts' },
                {
                    $group: {
                        _id: '$contacts.emailValidation.status',
                        value: { $sum: 1 },
                    },
                },
            ]);
            const validationData = Object.values(index_2.EmailValidationStatus).map((status) => {
                const match = validationDist.find((d) => d._id === status);
                return {
                    status,
                    count: match ? match.value : 0,
                };
            });
            // 3. Campaign Performance Comparison
            const campaignPerformance = await index_1.Campaign.find({ createdBy: userObjectId })
                .sort({ createdAt: -1 })
                .limit(6);
            const campaignComparison = campaignPerformance.map((c) => ({
                name: c.campaignName,
                sent: c.statistics.emailsSent || 0,
                delivered: c.statistics.emailsDelivered || 0,
                opened: c.statistics.emailsOpened || 0,
                clicked: c.statistics.emailsClicked || 0,
                failed: c.statistics.emailsFailed || 0,
            }));
            // 4. Sent vs Failed ratios
            let totalSent = 0;
            let totalFailed = 0;
            campaignComparison.forEach((c) => {
                totalSent += c.sent;
                totalFailed += c.failed;
            });
            const sentVsFailed = [
                { name: 'Sent', value: totalSent },
                { name: 'Failed', value: totalFailed },
            ];
            return {
                dailyActivity,
                validationDistribution: validationData,
                campaignComparison,
                sentVsFailed,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching charts data:', error);
            throw error;
        }
    }
}
exports.default = new AnalyticsService();
