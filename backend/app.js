const authRoutes = require('./auth'); // Import authentication routes
const authMiddleware = require('./authMiddleware'); // Middleware for authentication
const express = require('express');
require('dotenv').config(); // Load environment variables
const path = require('path'); // Manage file paths
const mongoose = require('mongoose'); // ODM for MongoDB
const Book = require('./models/Book'); // Book model
const multer = require('./multer-config'); // Multer configuration for file uploads
const sharp = require('sharp'); // Image optimization library
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
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((error) => console.log('Connexion à MongoDB échouée :', error));

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve authentication routes
app.use('/api/auth', authRoutes);

// Serve static files from the "uploads" directory
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('uploadsPath:', uploadsPath);

// Fetch all books from the database
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des livres' });
  }
});

// Update an existing book
app.put('/api/books/:id', authMiddleware(), multer, async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé' });
      }
  
      // Parse the updated book data from the request body
      const updatedData = JSON.parse(req.body.book);
  
      if (req.file) {
        // Handle new image upload
        const sanitizedFilename = path.basename(req.file.filename, path.extname(req.file.filename));
        const originalFilePath = path.join(uploadsPath, req.file.filename);
        const optimizedFilePath = path.join(uploadsPath, `optimized-${sanitizedFilename}.jpeg`);
  
        await sharp(originalFilePath)
          .resize(206, 260) // Resize the image
          .toFormat('jpeg') // Convert to JPEG
          .jpeg({ quality: 90 }) // Set JPEG quality
          .toFile(optimizedFilePath);
  
        // Delete old image if it exists
        if (book.imageUrl) {
          const oldImagePath = path.join(__dirname, book.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
  
        // Update the imageUrl field with the new file
        updatedData.imageUrl = `/uploads/optimized-${sanitizedFilename}.jpeg`;
      }
  
      // Update book fields with the new data
      Object.assign(book, updatedData);
      await book.save();
  
      res.status(200).json({ message: 'Livre modifié avec succès', book });
    } catch (error) {
      console.error('Erreur lors de la modification du livre :', error);
      res.status(500).json({ error: 'Erreur lors de la modification du livre' });
    }
  });
  
// Add a new book
  app.post('/api/books', authMiddleware(), multer, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Image requise' });
      }
  
      const sanitizedFilename = path.basename(req.file.filename, path.extname(req.file.filename));
      const originalFilePath = path.join(uploadsPath, req.file.filename);
      const optimizedFilePath = path.join(uploadsPath, `optimized-${sanitizedFilename}.jpeg`);
  
      await sharp(originalFilePath)
        .resize(206, 260)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(optimizedFilePath);
  
      const bookData = JSON.parse(req.body.book);
      const book = new Book({
        ...bookData,
        imageUrl: `/uploads/optimized-${sanitizedFilename}.jpeg`,
      });
  
      await book.save();
      res.status(201).json({ message: 'Livre ajouté avec succès', book });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du livre :', error);
      res.status(500).json({ error });
    }
  });
  
// Update an existing book
app.put('/api/books/:id', authMiddleware(), multer, async (req, res) => {
    try {
      // Find the book by ID in the database
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
  
      // Parse updated book data from the request body
      const updatedData = JSON.parse(req.body.book);
  
      // Check if a new image file is provided
      if (req.file) {
        const sanitizedFilename = path.basename(req.file.filename, path.extname(req.file.filename));
        const originalFilePath = path.join(uploadsPath, req.file.filename);
        const optimizedFilePath = path.join(uploadsPath, `optimized-${sanitizedFilename}.jpeg`);
  
        // Convert and optimize the image to JPEG format
        await sharp(originalFilePath)
          .resize(206, 260) // Resize the image to the specified dimensions
          .toFormat('jpeg') // Convert the image to JPEG format
          .jpeg({ quality: 90 }) // Set JPEG quality to 90%
          .toFile(optimizedFilePath);
  
        // If an old image exists, delete it
        if (book.imageUrl) {
          const oldImagePath = path.join(__dirname, book.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath); // Delete the old image file
          }
        }
  
        // Update the image URL with the new file path
        updatedData.imageUrl = `/uploads/optimized-${sanitizedFilename}.jpeg`;
      }
  
      // Update book fields with the new data
      Object.assign(book, updatedData);
  
      // Save the updated book in the database
      await book.save();
  
      res.status(200).json({ message: 'Book successfully updated', book });
    } catch (error) {
      console.error('Error while updating the book:', error); // Log the error for debugging
      res.status(500).json({ error: 'Error while updating the book' });
    }
  });  

// Add a rating to a book
app.post('/api/books/:id/rating', authMiddleware(), async (req, res) => {
  try {
    const { userId, rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5 étoiles.' });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    book.ratings.push({ userId, grade: rating });
    const totalRatings = book.ratings.reduce((sum, r) => sum + r.grade, 0);
    book.averageRating = (totalRatings / book.ratings.length).toFixed(1);

    await book.save();
    res.status(200).json(book);
  } catch (error) {
    console.error('Erreur lors de la notation du livre :', error);
    res.status(500).json({ message: 'Erreur lors de la notation du livre.' });
  }
});

// Fetch a single book by its ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// Add a new book
app.post('/api/books', authMiddleware('add'), multer, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image requise' });
    }

    const sanitizedFilename = path.basename(req.file.filename, path.extname(req.file.filename));
    const originalFilePath = path.join(uploadsPath, req.file.filename);
    const optimizedFilePath = path.join(uploadsPath, `optimized-${sanitizedFilename}.jpeg`);

    // Convert and optimize image to JPEG
    await sharp(originalFilePath)
      .resize(206, 260) // Resize the image
      .toFormat('jpeg') // Convert to JPEG
      .jpeg({ quality: 90 }) // Set JPEG quality
      .toFile(optimizedFilePath);

    // Parse and save book data
    const bookData = JSON.parse(req.body.book);
    const book = new Book({
      ...bookData,
      imageUrl: `/uploads/optimized-${sanitizedFilename}.jpeg`, // Update URL to JPEG
    });

    await book.save();
    res.status(201).json({ message: 'Livre ajouté avec succès', book });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du livre :', error);
    res.status(500).json({ error });
  }
});

// Delete a book and its images
app.delete('/api/books/:id', authMiddleware('delete'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé pour la suppression' });
    }

    const optimizedPath = path.join(__dirname, book.imageUrl);
    if (fs.existsSync(optimizedPath)) {
      fs.unlinkSync(optimizedPath);
    }

    await book.deleteOne();
    res.status(200).json({ message: 'Livre supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du livre' });
  }
});

module.exports = app;
