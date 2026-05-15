const router  = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl    = require('../controllers/visas');
const multer  = require('multer');

// Use memory storage — files are streamed directly to SharePoint
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/',      requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), ctrl.list);
router.get('/:id',   requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), ctrl.getById);
router.post('/',     requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), ctrl.create);
router.patch('/:id', requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), ctrl.update);

// Stage transition — triggers customer notification automatically
router.patch('/:id/stage', requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), ctrl.updateStage);

// Upload a document to SharePoint for a visa application
router.post('/:id/documents', requireRole(ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN),
  upload.single('file'), ctrl.uploadDocument);

// Get visa checklist for a specific visa type
router.get('/checklist/:visaTypeId', requireRole(ROLES.VISA, ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), ctrl.getChecklist);

// List all visa types (for dropdowns)
router.get('/types/all', requireRole(ROLES.VISA, ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), ctrl.listVisaTypes);

module.exports = router;
