/**
 * Campaign Routes
 */

import { Router } from 'express';
import { CampaignController } from '../controllers/CampaignController';
import { authenticate, requireOperator } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOperator);

// Campaign CRUD
router.post('/', CampaignController.create);
router.get('/', CampaignController.list);
router.get('/:id', CampaignController.getById);
router.get('/:id/export', CampaignController.exportLogs);
router.put('/:id', CampaignController.update);
router.delete('/:id', CampaignController.delete);

// Campaign actions
router.post('/:id/duplicate', CampaignController.duplicate);
router.post('/:id/pause', CampaignController.pause);
router.post('/:id/resume', CampaignController.resume);
router.post('/:id/cancel', CampaignController.cancel);
router.post('/:id/launch', CampaignController.launch);
router.post('/:id/validate-contacts', CampaignController.validateContacts);
router.post('/:id/update-statistics', CampaignController.updateStatistics);
router.post('/:id/reset', CampaignController.reset);

export default router;
