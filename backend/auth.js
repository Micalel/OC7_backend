const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); 
require('dotenv').config();

const router = express.Router();

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    // Hash the user's password before saving it in the database
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      email: req.body.email,
      password: hashedPassword,
    });

    await user.save(); // Save the new user in the database
    res.status(201).json({ message: 'Utilisateur créé avec succès !' });
  } catch (error) {
    console.error('Error during user signup:', error);
    res.status(400).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
  }
});

// Log in an existing user
router.post('/login', async (req, res) => {
  try {
    // Find the user in the database using the email provided
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    // Generate a JWT for the user
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Set the token to expire in 24 hours
    );

    res.status(200).json({
      userId: user._id,
      token,
    });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion de l\'utilisateur.' });
  }
});

module.exports = router;
