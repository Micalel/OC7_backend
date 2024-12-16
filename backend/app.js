  const authRoutes = require('./middlewares/auth'); // Import authentication routes
  const authMiddleware = require('./middlewares/authMiddleware'); // Middleware for authentication
  const express = require('express');
  require('dotenv').config(); // Load environment variables
  const path = require('path'); // Manage file paths
  const mongoose = require('mongoose'); // ODM for MongoDB
  const Book = require('./models/Book'); // Book model
  const { upload, processImage } = require('./config/multer-config'); // Multer configuration for file uploads
  const fs = require('fs'); // File system module
  const app = express(); // Create the Express application

  // Middleware to handle CORS issues
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204); // Handle preflight requests for CORS
    }
    next();
  });

  // Connect to the MongoDB database
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch((error) => console.log('Failed to connect to MongoDB:', error));

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // Serve authentication routes
  app.use('/api/auth', authRoutes);

  // Serve static files from the "uploads" directory
  const uploadsPath = path.join(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Fetch all books from the database (no authentication required)
  app.get('/api/books', async (req, res) => {
    try {
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des livres.' });
    }
  });

  // Fetch the best-rated books (no authentication required)
  app.get('/api/books/bestrating', async (req, res) => {
    try {
      const books = await Book.find()
        .sort({ averageRating: -1 })
        .limit(3);

      res.status(200).json(books);
    } catch (error) {
      console.log('Failed to retrieve best-rated books:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des livres les mieux notés.' });
    }
  });

  // Add a rating to a book
  app.post('/api/books/:id/rating', authMiddleware(), async (req, res) => {
    try {
      const { userId, rating } = req.body; // Extract the user ID and rating from the request body
      // IMPROVEMENTS: Might be worth to use req.auth.userId instead of userId for better security

      // Validate the rating value
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5 étoiles.' });
      }
      
      // Find the book by ID
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }

      // Add the new rating
      book.ratings.push({ userId, grade: rating });
      const totalRatings = book.ratings.reduce((sum, r) => sum + r.grade, 0);
      book.averageRating = (totalRatings / book.ratings.length).toFixed(1);

      await book.save();
      res.status(200).json(book);
    } catch (error) {
      console.error('Failed to add rating to book:', error);
      res.status(500).json({ message: 'Erreur lors de la notation du livre.' });
    }
  });

  // Fetch a single book by its ID (no authentication required)
  app.get('/api/books/:id', async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }
      res.status(200).json(book);
    } catch (error) {
      res.status(400).json({ error });
    }
  });

  // Update an existing book
  app.put('/api/books/:id', authMiddleware(), upload, processImage, async (req, res) => {
    try {

      const book = await Book.findById(req.params.id); // Find the book by ID
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }

      if (book.userId !== req.auth.userId) { // Check if the user is the owner of the book
        return res.status(403).json({ message: 'Requête non autorisée.' });
      }

      // Delete the old image if a new one is uploaded
      if (req.file && book.imageUrl) {
        const oldFilePath = path.join('uploads', path.basename(book.imageUrl));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Update the book data
      const updatedData = req.file
        ? {
            ...JSON.parse(req.body.book),
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`, // New image
          }
        : { ...req.body };

      Object.keys(updatedData).forEach((key) => {
        book[key] = updatedData[key];
      });

      await book.save();
      res.status(200).json({ message: 'Livre modifié avec succès.', book });
    } catch (error) {
      console.error('Failed to update book:', error);
      res.status(500).json({ error: 'Erreur interne lors de la mise à jour du livre.' });
    }
  });

  // Add a new book
  app.post('/api/books', authMiddleware('add'), upload, processImage, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Image requise.' });
      }

      const bookData = JSON.parse(req.body.book); // Extract the book data from the request body

      const book = new Book({
        ...bookData,
        imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`, // URL of the WebP image
      });

      await book.save();
      res.status(201).json({ message: 'Livre ajouté avec succès.', book });
    } catch (error) {
      console.error('Failed to add book:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du livre.' });
    }
  });

  // Delete a book and its images
  app.delete('/api/books/:id', authMiddleware('delete'), async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé pour la suppression.' });
      }

      // Delete the associated image
      const imagePath = path.join('uploads', path.basename(book.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      await book.deleteOne();
      res.status(200).json({ message: 'Livre supprimé avec succès.' });
    } catch (error) {
      console.error('Failed to delete book:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du livre.' });
    }
  });

  module.exports = app;
