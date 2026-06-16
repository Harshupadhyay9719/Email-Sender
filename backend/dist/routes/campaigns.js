"use strict";
/**
 * Campaign Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CampaignController_1 = require("../controllers/CampaignController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Setup file upload middleware for attachments
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
// Campaign file upload
router.post('/upload-attachment', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        res.status(200).json({
            success: true,
            file: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                s3Key: req.file.filename,
                s3Url: `/uploads/${req.file.filename}`,
                fileSize: req.file.size,
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
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