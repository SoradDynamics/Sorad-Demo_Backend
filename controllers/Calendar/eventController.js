// controllers/Calendar/eventController.js
const { storage } = require('../../config/appwrite');
const { AppwriteException, InputFile } = require('node-appwrite');

BUCKET_ID = process.env.APPWRITE_BUCKET_ID;
FILE_ID = process.env.APPWRITE_FILE_ID;

// --- Helper Function (Define it BEFORE it's used) ---
const parseSimpleDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

     try {
          const [year, month, day] = parts.map(Number);
          if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 32) {
              return null;
          }
          const date = new Date(Date.UTC(year, month - 1, day));
           if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
               return null;
           }
          return date;
     } catch {
         return null;
     }
}
// --- End Helper Function ---


// --- Get Calendar Data Controller ---
const getCalendarData = async (req, res) => {
    // ... existing code ...
};


// --- Add or Update Event Controller Function ---
const addOrUpdateEvent = async (req, res) => {
    const { eventName, startDate: startDateStr, endDate: endDateStr, color } = req.body;

    // ... Basic Validation (using res.status(400).json) ...
     if (!eventName || typeof eventName !== 'string' || !eventName.trim()) { return res.status(400).json({ message: 'Missing or invalid required field: eventName (string).' }); }
     if (!startDateStr || typeof startDateStr !== 'string') { return res.status(400).json({ message: 'Missing or invalid required field: startDate (string).' }); }
     if (!endDateStr || typeof endDateStr !== 'string') { return res.status(400).json({ message: 'Missing or invalid required field: endDate (string).' }); }
     if (!color || typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) { return res.status(400).json({ message: 'Missing or invalid required field: color (string, hex format #RRGGBB).' }); }


    // --- Date Validation (Now parseSimpleDate should be defined) ---
    // vvvvvvv This line caused the error vvvvvvv
    const startDt = parseSimpleDate(startDateStr);
    const endDt = parseSimpleDate(endDateStr);
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    if (!startDt || !endDt) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY/M/D or YYYY/MM/DD.' });
    }
     if (endDt < startDt) {
        return res.status(400).json({ message: 'End Date cannot be earlier than Start Date.' });
    }

    // ... Check Environment Variables ...
    if (!BUCKET_ID || !FILE_ID) { /* ... */ }

    // --- Main try/catch block ---
    try {
        // ... Fetch data ...
         let calendarData;
         try {
              calendarData = await storage.getFileDownload(BUCKET_ID, FILE_ID);
              if (typeof calendarData !== 'object' || calendarData === null) { /* ... */ }
         } catch (fetchError) { /* ... */ }


        // ... Modify Data (uses parseSimpleDate inside the loop) ...
         let updatedData = { ...calendarData };
         let changed = false;
         for (const year in updatedData) {
             if (!updatedData.hasOwnProperty(year) || !Array.isArray(updatedData[year])) continue;
             updatedData[year] = updatedData[year].map(monthData => {
                 if (!monthData || typeof monthData !== 'object' || !Array.isArray(monthData.days)) { /* ... */ return monthData; }
                 const newDays = monthData.days.map(day => {
                      if (!day || typeof day !== 'object' || typeof day.en !== 'string') { /* ... */ return day; }
                      // vvvvvvv Also used here vvvvvvv
                      const dayDt = parseSimpleDate(day.en);
                      if (dayDt && dayDt >= startDt && dayDt <= endDt) { /* ... */ }
                      return day;
                 });
                 return { ...monthData, days: newDays };
             });
         }


        if (!changed) { /* ... */ }

        // ... Convert to InputFile ...
        const updatedJsonString = JSON.stringify(updatedData, null, 2);
        const inputFile = InputFile.fromPlainText(updatedJsonString, 'calendar.json', 'application/json');

        // ... Upload (createFile) ...
        const uploadResponse = await storage.createFile(BUCKET_ID, FILE_ID, inputFile);

        // ... Success response ...
        res.status(200).json({ message: 'Event updated successfully.', data: updatedData });

    } catch (error) {
        // ... Error handling ...
        let statusCode = 500;
        let message = 'Failed to update event...';
         if (error instanceof AppwriteException) { /* ... */ }
         else if (error instanceof Error) { /* ... */ }
         else { /* ... */ }
        res.status(statusCode).json({ message: message, error: error.message || String(error) });
    }
};

module.exports = {
    getCalendarData,
    addOrUpdateEvent
};