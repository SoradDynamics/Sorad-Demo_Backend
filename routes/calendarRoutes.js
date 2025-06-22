// routes/calendarRoutes.js
const express = require('express');
// Import both controller functions
const { getCalendarData } = require('../controllers/Calendar/calendarController');
const { addOrUpdateEvent } = require('../controllers/Calendar/eventController');

const router = express.Router();

// GET /api/calendar/ - Fetch calendar data
router.get('/', getCalendarData);

// POST /api/calendar/event - Add or update an event across a date range
// router.post('/event', addOrUpdateEvent); // <-- Add new route


module.exports = router;