"use strict";
/**
 * Import Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ImportController_1 = require("../controllers/ImportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/templates', ImportController_1.ImportController.listTemplates);
router.get('/template/:type', ImportController_1.ImportController.downloadTemplate);
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
router.post('/preview-columns', ImportController_1.uploadMiddleware.single('file'), ImportController_1.ImportController.previewColumns);
router.post('/preview-mapped', ImportController_1.ImportController.previewMapped);
router.post('/:importId/confirm', ImportController_1.ImportController.confirm);
router.get('/:importId', ImportController_1.ImportController.getStatus);
exports.default = router;
//# sourceMappingURL=import.js.map