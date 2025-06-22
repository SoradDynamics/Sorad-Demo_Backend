// server/src/routes/proClientRoutes.js (CommonJS Version)
const express = require('express');
const proClientController = require('../controllers/proClientController.js'); // Assuming CommonJS export

// Example: If you had a middleware to check for 'pro' label, also in CommonJS
// const { requireProLabel } = require('../middlewares/authMiddleware.js'); // Hypothetical middleware

const router = express.Router();

// IMPORTANT: These routes should be protected by a middleware that ensures
// only users with 'pro' label can access them. This middleware would be applied
// in app.js before these routes are mounted.
// Example (if you had the middleware):
// router.use(requireProLabel);

router.delete('/:id', proClientController.deleteClientAndResources);
router.patch('/:id/status', proClientController.forceUpdateClientStatus); // Using PATCH for partial update

module.exports = router;