// middleware for rate limiting

const rateLimit = require('express-rate-limit');


//rate limit configuration for global requests
const reqLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    
    message: { error: 'Trop de requêtes effectuées depuis cette adresse IP, veuillez réessayer dans 15 minutes' }
    });

// rate limit configuration for login requests
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
    standardHeaders: true, // Include Retry-After header in the response
    legacyHeaders: false, // Exclude X-RateLimit-* headers from the response


    });

    module.exports = { reqLimiter, loginLimiter };

