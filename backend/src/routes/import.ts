/**
 * Import Routes
 */

import { Router } from 'express';
import { ImportController, uploadMiddleware } from '../controllers/ImportController';
import { authenticate, requireOperator } from '../middleware/auth';

const router = Router();

router.get('/templates', ImportController.listTemplates);
router.get('/template/:type', ImportController.downloadTemplate);

router.use(authenticate);
router.use(requireOperator);

router.post('/preview-columns', uploadMiddleware.single('file'), ImportController.previewColumns);
router.post('/preview-mapped', ImportController.previewMapped);
router.post('/:importId/confirm', ImportController.confirm);
router.get('/:importId', ImportController.getStatus);

export default router;
