const Book = require('../models/Book');
const path = require('path');
const fs = require('fs');

module.exports = {
  getAllBooks: async (req, res) => {
    try {
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des livres.' });
    }
  },

  getBestRatedBooks: async (req, res) => {
    try {
      const books = await Book.find()
        .sort({ averageRating: -1 })
        .limit(3);
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des livres les mieux notés.' });
    }
  },

  getBookById: async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }
      res.status(200).json(book);
    } catch (error) {
      res.status(400).json({ error });
    }
  },

  addRatingToBook: async (req, res) => {
    try {
      const { rating } = req.body;
      const userId = req.auth.userId; // Use authenticated user ID

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5 étoiles.' });
      }

      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }

      // Check if the user has already rated the book
      const existingRating = book.ratings.find((r) => r.userId === userId);
      if (existingRating) {
        return res.status(400).json({ message: 'Vous avez déjà noté ce livre.' });
      }

      book.ratings.push({ userId, grade: rating });
      const totalRatings = book.ratings.reduce((sum, r) => sum + r.grade, 0);
      book.averageRating = (totalRatings / book.ratings.length).toFixed(1);

      await book.save();
      res.status(200).json(book);
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la notation du livre.' });
    }
  },

  updateBook: async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé.' });
      }

      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: 'Requête non autorisée.' });
      }

      if (req.file && book.imageUrl) {
        const oldFilePath = path.join('uploads', path.basename(book.imageUrl));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const updatedData = req.file
        ? {
            ...JSON.parse(req.body.book),
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
          }
        : { ...req.body };

      Object.keys(updatedData).forEach((key) => {
        book[key] = updatedData[key];
      });

      await book.save();
      res.status(200).json({ message: 'Livre modifié avec succès.', book });
    } catch (error) {
      res.status(500).json({ error: 'Erreur interne lors de la mise à jour du livre.' });
    }
  },

  addBook: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Image requise.' });
      }

      const bookData = JSON.parse(req.body.book);

      const book = new Book({
        ...bookData,
        imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
      });

      await book.save();
      res.status(201).json({ message: 'Livre ajouté avec succès.', book });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'ajout du livre.' });
    }
  },

  deleteBook: async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé pour la suppression.' });
      }

      const imagePath = path.join('uploads', path.basename(book.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      await book.deleteOne();
      res.status(200).json({ message: 'Livre supprimé avec succès.' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la suppression du livre.' });
    }
  },
};
