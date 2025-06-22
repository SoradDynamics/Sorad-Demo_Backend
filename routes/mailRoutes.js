// PROJECT_ROOT/routes/mailRoutes.js
const express = require('express');
const router = express.Router();

// CRITICAL: Ensure this path is correct.
// If 'routes' and 'controllers' are siblings, '../controllers/mailController' is correct.
const mailController = require('../controllers/Mail/mailController');

// FOR DEBUGGING - Keep these for now if the error persists after this correction
// //console.log('--- In routes/mailRoutes.js ---');
// //console.log('Imported mailController object:', mailController); // Should show all exported functions
// //console.log('typeof mailController.handleGenericSendEmail:', typeof mailController.handleGenericSendEmail); // Should be 'function'

// Ensure you are using the correct exported function name
// The error is on this line (or equivalent if your path is different):
router.post('/send', mailController.handleGenericSendEmail); // Using the exported API handler

// If you prefer destructuring (make sure the name matches the export):
// const { handleGenericSendEmail } = require('../controllers/mailController');
// router.post('/send', handleGenericSendEmail);

module.exports = router;