const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routeur/routeur_auth');
const bookRoutes = require('./routeur/routeur_books');
const { loginLimiter, reqLimiter } = require('./middlewares/rate_limit');
dotenv.config({ path: './config/.env' });
const app = express();

// Middleware to handle rate limiting
app.use(reqLimiter);

// Middleware to handle CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // handles preflight request
  }
  next();
});

// Recomposes the MongoDB URI
const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/${process.env.MONGO_DB_NAME}?${process.env.MONGO_OPTIONS}`;

// Connects to the MongoDB database
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connecté à MongoDB avec succès !'))
  .catch((error) => console.log('Échec de la connexion à MongoDB :', error));

// middleware to parse the request body
app.use(express.json());

// authentification routes
app.use('/api/auth', loginLimiter, authRoutes);

// books routes
app.use('/api/books', bookRoutes);

// serve the uploads folder statically
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

module.exports = app;
