
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
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
}).single('image'); // Single file upload


// Middleware to process the image
const processImage = async (req, res, next) => {
  if (req.file) {
    const originalPath = req.file.path; // Path of the uploaded file
    const outputFilename = `${Date.now()}-${path.basename(originalPath, path.extname(originalPath))}.webp`; // Generate WebP filename
    const outputPath = path.join(path.dirname(originalPath), outputFilename); // Full path for the converted file

    try {
      
      // Convert the image to WebP format
      await sharp(originalPath)
        .webp({ quality: 80 }) // Set the quality of the WebP image
        .toFile(outputPath);

      // delete the original image after conversion
      fs.unlinkSync(originalPath);

      // Update the request object with the new file details
      req.file.filename = outputFilename;
      req.file.path = outputPath;

      next(); // Continue to the next middleware
    } catch (error) {
      console.error('Erreur lors de la conversion en WebP :', error);
      next(error); // Pass the error to the error handler
    }
  } else {
    next(); // If no file is uploaded, continue to the next middleware
  }
};

module.exports = { upload, processImage };
