/**
 * Organization Routes
 */

import { Router } from 'express';
import { OrganizationController } from '../controllers/OrganizationController';
import { authenticate, requireOperator } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOperator);

// Organization CRUD
router.post('/', OrganizationController.create);
router.get('/', OrganizationController.list);
router.get('/export', OrganizationController.exportOrgs);
router.get('/:id', OrganizationController.getById);
router.put('/:id', OrganizationController.update);
router.delete('/:id', OrganizationController.delete);

// Contact management
router.post('/:id/contacts', OrganizationController.addContact);
router.put('/:id/contacts/:contactId', OrganizationController.updateContact);
router.delete('/:id/contacts/:contactId', OrganizationController.deleteContact);
router.post('/:id/validate', OrganizationController.validateContacts);

export default router;
