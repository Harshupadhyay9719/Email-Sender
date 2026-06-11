"use strict";
/**
 * Organization Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrganizationController_1 = require("../controllers/OrganizationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
// Organization CRUD
router.post('/', OrganizationController_1.OrganizationController.create);
router.get('/', OrganizationController_1.OrganizationController.list);
router.get('/export', OrganizationController_1.OrganizationController.exportOrgs);
router.get('/:id', OrganizationController_1.OrganizationController.getById);
router.put('/:id', OrganizationController_1.OrganizationController.update);
router.delete('/:id', OrganizationController_1.OrganizationController.delete);
// Contact management
router.post('/:id/contacts', OrganizationController_1.OrganizationController.addContact);
router.put('/:id/contacts/:contactId', OrganizationController_1.OrganizationController.updateContact);
router.delete('/:id/contacts/:contactId', OrganizationController_1.OrganizationController.deleteContact);
router.post('/:id/validate', OrganizationController_1.OrganizationController.validateContacts);
exports.default = router;
//# sourceMappingURL=organizations.js.map