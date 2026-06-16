/**
 * Campaign Routes
 */

import { Router } from 'express';
import { CampaignController } from '../controllers/CampaignController';
import { authenticate, requireOperator } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup file upload middleware for attachments
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOperator);

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
