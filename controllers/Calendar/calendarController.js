
const {storage} = require('../../config/appwrite');

// --- Controller Function ---
const getCalendarData = async (req, res) => {
    const BUCKET_ID = process.env.APPWRITE_BUCKET_ID;
    const FILE_ID = process.env.APPWRITE_FILE_ID;

    if (!BUCKET_ID || !FILE_ID) {
        console.error("Error: Appwrite Bucket ID or File ID missing in .env");
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    try {
        // //console.log(`Attempting to get file content: ${FILE_ID} from bucket: ${BUCKET_ID}`);

        // Use getFileDownload - Assume it returns the parsed JS object for JSON files
        const calendarData = await storage.getFileDownload(BUCKET_ID, FILE_ID);

        // --- Validation ---
        // Check if we received an object as expected
        if (typeof calendarData !== 'object' || calendarData === null) {
            console.error('Error: Appwrite storage.getFileDownload did not return an object for the JSON file.');
            console.error('Received type:', typeof calendarData, 'Value:', calendarData);
            throw new Error('Unexpected response type from Appwrite storage for JSON file.');
        }
        // --- End Validation ---


        // --- Data is already parsed ---
        // No need for:
        // fileBuffer.toString('utf-8');
        // JSON.parse(jsonString);


        // //console.log(`Successfully fetched and parsed calendar data object for file: ${FILE_ID}`);
        res.status(200).json(calendarData); // Send the already parsed object

    } catch (error) {
        console.error('Error fetching/processing calendar data:', error);

        let statusCode = 500;
        let message = 'Failed to process calendar data.';

        // Check for specific error types
        // SyntaxError is unlikely now, as parsing happens within the SDK
        if (error instanceof sdk.AppwriteException) { // Handle Appwrite specific errors
             console.error("Appwrite SDK Error:", error);
             statusCode = error.code || 500; // Use Appwrite error code if available
             message = error.message || 'Appwrite storage error.';
             if (error.code === 404) {
                 message = `File not found (Bucket: ${BUCKET_ID}, File: ${FILE_ID}). Check IDs and permissions.`;
             } else if (error.code === 401 || error.code === 403) {
                 message = 'Appwrite authentication/permission error. Check API Key and file permissions.';
             }
        } else {
             // General errors (like the object type check failure)
             message = error.message || 'An unexpected server error occurred.';
        }


        res.status(statusCode).json({ message: message, error: error.message || error.toString() }); // Send error details
    }
};

module.exports = {
    getCalendarData,
};  