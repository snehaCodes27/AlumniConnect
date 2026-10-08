const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const studentProfileController = require('../controllers/studentProfile.controller');
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
router.use(authorizeRoles('STUDENT'));

router.get('/', studentProfileController.getStudentProfile);
router.put('/', studentProfileController.updateStudentProfile);
router.post('/photo', upload.single('photo'), studentProfileController.updateProfilePhoto);
router.post('/resume', upload.single('resume'), studentProfileController.updateResume);

module.exports = router;