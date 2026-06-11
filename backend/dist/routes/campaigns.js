"use strict";
/**
 * Campaign Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CampaignController_1 = require("../controllers/CampaignController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
// Campaign CRUD
router.post('/', CampaignController_1.CampaignController.create);
router.get('/', CampaignController_1.CampaignController.list);
router.get('/:id', CampaignController_1.CampaignController.getById);
router.get('/:id/export', CampaignController_1.CampaignController.exportLogs);
router.put('/:id', CampaignController_1.CampaignController.update);
router.delete('/:id', CampaignController_1.CampaignController.delete);
// Campaign actions
router.post('/:id/duplicate', CampaignController_1.CampaignController.duplicate);
router.post('/:id/pause', CampaignController_1.CampaignController.pause);
router.post('/:id/resume', CampaignController_1.CampaignController.resume);
router.post('/:id/cancel', CampaignController_1.CampaignController.cancel);
router.post('/:id/launch', CampaignController_1.CampaignController.launch);
router.post('/:id/validate-contacts', CampaignController_1.CampaignController.validateContacts);
router.post('/:id/update-statistics', CampaignController_1.CampaignController.updateStatistics);
router.post('/:id/reset', CampaignController_1.CampaignController.reset);
exports.default = router;
//# sourceMappingURL=campaigns.js.map