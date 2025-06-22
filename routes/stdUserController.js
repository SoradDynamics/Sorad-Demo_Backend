// routes/stdUserController.js
const express = require('express');
// Import the generalized controller functions
const { signupUser } = require('../controllers/StdUser/signupControllers');
const { deleteUser } = require('../controllers/StdUser/deleteControllers');

const router = express.Router();

// --- Define Routes ---

// POST /signup - Create a new user (labels optional in body)
router.post('/signup', signupUser);

// DELETE /:userId - Delete a user by Appwrite User ID
router.delete('/:userId', deleteUser);


module.exports = router;