"use strict";
/**
 * Import Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ImportController_1 = require("../controllers/ImportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public template download (optional - no auth required)
router.get('/template', ImportController_1.ImportController.downloadTemplate);
// Protected routes
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
// Import operations
router.post('/upload', ImportController_1.uploadMiddleware.single('file'), ImportController_1.ImportController.upload);
router.post('/:importId/confirm', ImportController_1.ImportController.confirm);
router.get('/:importId', ImportController_1.ImportController.getStatus);
exports.default = router;
//# sourceMappingURL=import.js.map