// routes/userRoutes.js
const express = require('express');

// Import specific handlers from their controller files
const { handleSignup } = require('../controllers/User/signupController');
const { handleDeleteUser } = require('../controllers/User/deleteUserController');

const router = express.Router();

// POST /api/users/signup - Route for creating users
router.post('/signup', handleSignup); // Uses the signup handler

// DELETE /api/users/delete/:userId - Route for deleting a user
router.delete('/delete/:userId', handleDeleteUser); // Uses the delete handler

module.exports = router;