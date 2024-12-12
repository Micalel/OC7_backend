const jwt = require('jsonwebtoken');

// Middleware for verifying JWT tokens
module.exports = () => (req, res, next) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization.split(' ')[1];

    // Verify and decode the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user ID from the token to the request object
    req.auth = { userId: decodedToken.userId };

    next(); // Continue to the next middleware or route handler
    
  } catch (error) {
    // If any error occurs, return a 401 Unauthorized response
    res.status(401).json({ error: 'Requête non authentifiée' });
  }
};
