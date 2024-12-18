// routeur_auth.js
const express = require('express');
const { body } = require('express-validator');
const userController = require('../controller/userController');

const router = express.Router();

// Validation rules
const validateSignup = [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password')
    .isLength({ min: 6 }) // Don't matter for the password length, not the point here. Can be changed at a later time.
    .withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').notEmpty().withMessage('Le mot de passe est requis.'),
];

// Routes
router.post('/signup', validateSignup, userController.signup);
router.post('/login', validateLogin, userController.login);

module.exports = router;
