import { Request, Response, NextFunction } from 'express';
import { User, ConnectedAccount, Campaign, EmailLog } from '../models/index';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class AdminController {
  /**
   * GET /admin/stats
   * Get system-wide stats for the admin dashboard
   */
  static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usersCount = await User.countDocuments();
      const accountsCount = await ConnectedAccount.countDocuments();
      const campaignsCount = await Campaign.countDocuments();
      const emailsCount = await EmailLog.countDocuments();

      // Aggregate status statistics from EmailLog
      const stats = await EmailLog.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const emailStatus: Record<string, number> = {
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

      ResponseHandler.success(res, 200, 'Admin statistics fetched successfully', {
        counts: {
          users: usersCount,
          connectedIds: accountsCount,
          campaigns: campaignsCount,
          emails: emailsCount
        },
        emailsByStatus: emailStatus
      });
    } catch (error) {
      logger.error('Error fetching admin statistics:', error);
      next(error);
    }
  }

  /**
   * GET /admin/connected-accounts
   * Get list of all Google connected accounts in the system
   */
  static async getConnectedAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await ConnectedAccount.find()
        .populate('userId', 'firstName lastName email role isActive')
        .sort({ createdAt: -1 });

      ResponseHandler.success(res, 200, 'All connected accounts fetched successfully', { accounts });
    } catch (error) {
      logger.error('Error fetching connected accounts:', error);
      next(error);
    }
  }

  /**
   * GET /admin/users
   * Get list of all users in the system
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.find()
        .select('-hashedPassword')
        .sort({ createdAt: -1 });

      ResponseHandler.success(res, 200, 'All users fetched successfully', { users });
    } catch (error) {
      logger.error('Error fetching users:', error);
      next(error);
    }
  }

  /**
   * PATCH /admin/users/:userId/status
   * Toggle a user's active status
   */
  static async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (req.user?.userId === userId) {
        throw new ValidationError('You cannot deactivate your own account');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = !user.isActive;
      await user.save();

      logger.info(`Admin toggled status for user ${userId} to ${user.isActive}`);

      ResponseHandler.success(res, 200, `User is now ${user.isActive ? 'active' : 'inactive'}`, {
        user: {
          _id: user._id,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error) {
      logger.error('Error toggling user status:', error);
      next(error);
    }
  }

  /**
   * PATCH /admin/users/:userId/role
   * Update a user's role
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['Admin', 'Operator', 'Viewer'].includes(role)) {
        throw new ValidationError('Invalid role specified');
      }

      if (req.user?.userId === userId) {
        throw new ValidationError('You cannot change your own role');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.role = role;
      await user.save();

      logger.info(`Admin updated role for user ${userId} to ${role}`);

      ResponseHandler.success(res, 200, `User role updated to ${role}`, {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      next(error);
    }
  }

  /**
   * DELETE /admin/connected-accounts/:accountId
   * Force disconnect a connected Google account (ID)
   */
  static async disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const account = await ConnectedAccount.findById(accountId);
      if (!account) {
        throw new NotFoundError('Connected account not found');
      }

      await ConnectedAccount.deleteOne({ _id: accountId });
      logger.info(`Admin disconnected Google account ${account.email} (ID: ${accountId})`);

      ResponseHandler.success(res, 200, `Successfully disconnected account ${account.email}`);
    } catch (error) {
      logger.error('Error disconnecting account:', error);
      next(error);
    }
  }

  /**
   * GET /admin/email-logs
   * Get system-wide email sending logs (history of all IDs)
   */
  static async getSystemEmailLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || '';

      const query: any = {};

      if (status) {
        query.status = status;
      }

      if (search) {
        // Find campaigns matching the sender email or name or campaign name
        const campaigns = await Campaign.find({
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

      const total = await EmailLog.countDocuments(query);

      const logs = await EmailLog.find(query)
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

      ResponseHandler.success(res, 200, 'System email logs fetched successfully', {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching system email logs:', error);
      next(error);
    }
  }
}
