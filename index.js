//  server.js
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

// Import API routes
const userRoutes = require('./routes/userRoutes'); 
const calendarRoutes = require('./routes/calendarRoutes');
const stdUserRoutes = require('./routes/stdUserController');
const clientRoutes = require('./routes/clientRoutes.js');
const proClientRoutes = require('./routes/proClientRoutes.js');
const mailRoutes = require("./routes/mailRoutes");

const { populateUserOptional } = require('./middlewares/populateUserMiddleware.js');

const schoolRoutes = require('./routes/schoolRoutes');


const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // IMPORTANT

// --- Middleware ---
// ✅ Apply CORS BEFORE routes
app.use(cors({
  origin: 'https://school.soraddynamics.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // if you're using cookies/auth headers
}));

// Optional: handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// app.use(populateUserOptional);
// //console.log('[App.js] populateUserOptional middleware applied globally.');

 
// --- API Routes ---
app.use('/api/users', userRoutes); 
app.use('/api/calendar', calendarRoutes)
app.use('/api/users/auth', stdUserRoutes);

app.use('/api/clients', clientRoutes);
app.use('/api/pro/clients', proClientRoutes);

app.use('/api', schoolRoutes);


// db
app.use('/api/schools', schoolRoutes);

app.use("/api", mailRoutes);



// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack || err); // Log error details
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// --- Start Server ---
app.listen(PORT,HOST, () => {
  //console.log(`Server running on port ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);


  if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      console.warn("WARN: Check Appwrite environment variables in .env!");
  }
});
