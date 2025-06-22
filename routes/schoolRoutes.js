const express = require('express');
const schoolController = require('../controllers/schoolController');
const router = express.Router();
router.post('/info-by-domain', schoolController.getSchoolInfoByDomain); // Ensure this line is correct
router.post('/resolve-info', schoolController.resolveSchoolByEmailOrPreferences);

module.exports = router;