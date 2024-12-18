// userController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

module.exports = {
  signup: async (req, res) => {
    try {
      // Validate request data
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        email: req.body.email,
        password: hashedPassword,
      });

      // Save the new user
      await user.save();
      res.status(201).json({ message: 'Utilisateur créé avec succès !' });
    } catch (error) {
      console.error('Erreur lors de l\'inscription :', error);
      res.status(400).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
    }
  },

  login: async (req, res) => {
    try {
      // Validate request data
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find user by email
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Mot de passe incorrect.' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        userId: user._id,
        token,
      });
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      res.status(500).json({ error: 'Erreur lors de la connexion de l\'utilisateur.' });
    }
  },
};
