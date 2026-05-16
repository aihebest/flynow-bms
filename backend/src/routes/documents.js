const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl   = require('../controllers/documents');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/',      requireRole(ROLES.SALES, ROLES.VISA, ROLES.HR, ROLES.MANAGER, ROLES.ADMIN), ctrl.list);
router.get('/:id',   requireRole(ROLES.SALES, ROLES.VISA, ROLES.HR, ROLES.MANAGER, ROLES.ADMIN), ctrl.getById);
router.post('/',     requireRole(ROLES.SALES, ROLES.VISA, ROLES.HR, ROLES.MANAGER, ROLES.ADMIN),
  upload.single('file'), ctrl.upload);
router.delete('/:id',requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.remove);

// Get a short-lived download URL from SharePoint
router.get('/:id/download-url', requireRole(ROLES.SALES, ROLES.VISA, ROLES.HR, ROLES.MANAGER, ROLES.ADMIN), ctrl.getDownloadUrl);

module.exports = router;
