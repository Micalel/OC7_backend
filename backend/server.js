require('dotenv').config(); // Load environment variables
const http = require('http'); // Core HTTP module
const app = require('./app'); // Import the Express app

// Set the port for the backend
const port = process.env.PORT

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Start the server
server.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // Handle specific listen errors
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges.`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use.`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});
