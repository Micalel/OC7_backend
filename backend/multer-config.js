// multer-config.js
const multer = require('multer');
const path = require('path');

// Configuration of multer storage
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'uploads'); // Directory where files will be stored
  },
  filename: (req, file, callback) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    callback(null, uniqueName); // Unique name for the uploaded file
  },
});

// File filter to accept only images
const fileFilter = (req, file, callback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    callback(null, true); // Accept the file
  } else {
    callback(new Error('Only image files are allowed'), false); // Reject the file
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter,
});

module.exports = upload.single('image');
