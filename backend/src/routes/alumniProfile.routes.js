const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const alumniProfileController = require('../controllers/alumniProfile.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticateToken);
router.use(authorizeRoles('ALUMNI'));

router.get('/', alumniProfileController.getAlumniProfile);
router.post(
  '/onboarding',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  alumniProfileController.completeOnboarding
);
router.put('/', alumniProfileController.updateAlumniProfile);
router.post('/photo', upload.single('photo'), alumniProfileController.updateProfilePhoto);
router.post('/resume', upload.single('resume'), alumniProfileController.uploadResume);

module.exports = router;
