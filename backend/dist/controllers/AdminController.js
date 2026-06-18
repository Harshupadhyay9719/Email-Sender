"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class AdminController {
    /**
     * GET /admin/stats
     * Get system-wide stats for the admin dashboard
     */
    static async getDashboardStats(req, res, next) {
        try {
            const usersCount = await index_1.User.countDocuments();
            const accountsCount = await index_1.ConnectedAccount.countDocuments();
            const campaignsCount = await index_1.Campaign.countDocuments();
            const emailsCount = await index_1.EmailLog.countDocuments();
            // Aggregate status statistics from EmailLog
            const stats = await index_1.EmailLog.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);
            const emailStatus = {
                queued: 0,
                sent: 0,
                delivered: 0,
                failed: 0,
                bounced: 0,
                skipped: 0
            };
            stats.forEach((s) => {
                if (s._id) {
                    emailStatus[s._id] = s.count;
                }
            });
            responseHandler_1.ResponseHandler.success(res, 200, 'Admin statistics fetched successfully', {
                counts: {
                    users: usersCount,
                    connectedIds: accountsCount,
                    campaigns: campaignsCount,
                    emails: emailsCount
                },
                emailsByStatus: emailStatus
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching admin statistics:', error);
            next(error);
        }
    }
    /**
     * GET /admin/connected-accounts
     * Get list of all Google connected accounts in the system
     */
    static async getConnectedAccounts(req, res, next) {
        try {
            const accounts = await index_1.ConnectedAccount.find()
                .populate('userId', 'firstName lastName email role isActive')
                .sort({ createdAt: -1 });
            responseHandler_1.ResponseHandler.success(res, 200, 'All connected accounts fetched successfully', { accounts });
        }
        catch (error) {
            logger_1.default.error('Error fetching connected accounts:', error);
            next(error);
        }
    }
    /**
     * GET /admin/users
     * Get list of all users in the system
     */
    static async getUsers(req, res, next) {
        try {
            const users = await index_1.User.find()
                .select('-hashedPassword')
                .sort({ createdAt: -1 });
            responseHandler_1.ResponseHandler.success(res, 200, 'All users fetched successfully', { users });
        }
        catch (error) {
            logger_1.default.error('Error fetching users:', error);
            next(error);
        }
    }
    /**
     * PATCH /admin/users/:userId/status
     * Toggle a user's active status
     */
    static async toggleUserStatus(req, res, next) {
        try {
            const { userId } = req.params;
            if (req.user?.userId === userId) {
                throw new errors_1.ValidationError('You cannot deactivate your own account');
            }
            const user = await index_1.User.findById(userId);
            if (!user) {
                throw new errors_1.NotFoundError('User not found');
            }
            user.isActive = !user.isActive;
            await user.save();
            logger_1.default.info(`Admin toggled status for user ${userId} to ${user.isActive}`);
            responseHandler_1.ResponseHandler.success(res, 200, `User is now ${user.isActive ? 'active' : 'inactive'}`, {
                user: {
                    _id: user._id,
                    email: user.email,
                    isActive: user.isActive
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error toggling user status:', error);
            next(error);
        }
    }
    /**
     * PATCH /admin/users/:userId/role
     * Update a user's role
     */
    static async updateUserRole(req, res, next) {
        try {
            const { userId } = req.params;
            const { role } = req.body;
            if (!['Admin', 'Operator', 'Viewer'].includes(role)) {
                throw new errors_1.ValidationError('Invalid role specified');
            }
            if (req.user?.userId === userId) {
                throw new errors_1.ValidationError('You cannot change your own role');
            }
            const user = await index_1.User.findById(userId);
            if (!user) {
                throw new errors_1.NotFoundError('User not found');
            }
            user.role = role;
            await user.save();
            logger_1.default.info(`Admin updated role for user ${userId} to ${role}`);
            responseHandler_1.ResponseHandler.success(res, 200, `User role updated to ${role}`, {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error updating user role:', error);
            next(error);
        }
    }
    /**
     * DELETE /admin/connected-accounts/:accountId
     * Force disconnect a connected Google account (ID)
     */
    static async disconnectAccount(req, res, next) {
        try {
            const { accountId } = req.params;
            const account = await index_1.ConnectedAccount.findById(accountId);
            if (!account) {
                throw new errors_1.NotFoundError('Connected account not found');
            }
            await index_1.ConnectedAccount.deleteOne({ _id: accountId });
            logger_1.default.info(`Admin disconnected Google account ${account.email} (ID: ${accountId})`);
            responseHandler_1.ResponseHandler.success(res, 200, `Successfully disconnected account ${account.email}`);
        }
        catch (error) {
            logger_1.default.error('Error disconnecting account:', error);
            next(error);
        }
    }
    /**
     * GET /admin/email-logs
     * Get system-wide email sending logs (history of all IDs)
     */
    static async getSystemEmailLogs(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const search = req.query.search || '';
            const status = req.query.status || '';
            const query = {};
            if (status) {
                query.status = status;
            }
            if (search) {
                // Find campaigns matching the sender email or name or campaign name
                const campaigns = await index_1.Campaign.find({
                    $or: [
                        { 'emailContent.from': { $regex: search, $options: 'i' } },
                        { 'emailContent.fromName': { $regex: search, $options: 'i' } },
                        { campaignName: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');
                const campaignIds = campaigns.map(c => c._id);
                query.$or = [
                    { recipientEmail: { $regex: search, $options: 'i' } },
                    { recipientName: { $regex: search, $options: 'i' } },
                    { campaignId: { $in: campaignIds } }
                ];
            }
            const total = await index_1.EmailLog.countDocuments(query);
            const logs = await index_1.EmailLog.find(query)
                .populate({
                path: 'campaignId',
                select: 'campaignName emailContent.from emailContent.fromName createdBy',
                populate: {
                    path: 'createdBy',
                    select: 'firstName lastName email'
                }
            })
                .populate('organizationId', 'companyName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            responseHandler_1.ResponseHandler.success(res, 200, 'System email logs fetched successfully', {
                logs,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching system email logs:', error);
            next(error);
        }
    }
}
exports.AdminController = AdminController;
