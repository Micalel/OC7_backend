const mongoose = require('mongoose');

// Schema for the user model
const userSchema = mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
  },
  password: { 
    type: String, 
    required: true, 
  },
});

// Exporting the User model
module.exports = mongoose.model('User', userSchema);
