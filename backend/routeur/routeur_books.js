// route_book.js
const express = require('express');
const router = express.Router();
const bookController = require('../controller/bookController'); // import the book controller
const authMiddleware = require('../middlewares/authMiddleware'); // middleware to protect routes
const { upload, processImage } = require('../config/multer-config'); // multer configuration

// Public routes (no need for authentication)
router.get('/', bookController.getAllBooks);
router.get('/bestrating', bookController.getBestRatedBooks);
router.get('/:id', bookController.getBookById);

// Protected routes (authentication required)
router.post('/:id/rating', authMiddleware(), bookController.addRatingToBook);
router.put('/:id', authMiddleware(), upload, processImage, bookController.updateBook);
router.post('/', authMiddleware('add'), upload, processImage, bookController.addBook);
router.delete('/:id', authMiddleware('delete'), bookController.deleteBook);

module.exports = router;
