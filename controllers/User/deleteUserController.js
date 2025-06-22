// controllers/deleteUserController.js
const { users } = require('../../config/appwrite'); // Import only necessary Appwrite service

// --- Delete User Controller ---
const handleDeleteUser = async (req, res) => {
    const { userId } = req.params;
    // //console.log(`--- Delete User Request Received for User ID: ${userId} ---`);

    // --- Input Validation ---
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.warn('Delete user request received with invalid User ID.');
        return res.status(400).json({ message: 'A valid User ID path parameter is required.' });
    }

    try {
        // //console.log(`Attempting to delete Appwrite User: ${userId}`);
        await users.delete(userId);
        // //console.log(`Successfully deleted Appwrite User: ${userId}`);
        res.status(200).json({ message: `User ${userId} deleted successfully.` });

    } catch (error) {
        console.error(`--- Error deleting User ${userId}: ---`, error);
        let statusCode = 500;
        let clientMessage = `Failed to delete user ${userId}.`;

        // Handle specific Appwrite error codes
        if (error.code === 404) {
            statusCode = 404;
            clientMessage = `User ${userId} not found. It might have been already deleted.`;
            console.warn(clientMessage);
        } else if (error.code === 401 || error.code === 403) {
             statusCode = error.code;
             clientMessage = "Server is not authorized to delete users. Check API Key permissions.";
             console.error("Authorization error deleting user. Verify Appwrite API Key scope includes 'users.write'.");
        } else if (error.message) {
             clientMessage = `Failed to delete user ${userId}: ${error.message}`;
        }

        res.status(statusCode).json({ message: clientMessage, error: error.toString() });
    }
};

module.exports = {
    handleDeleteUser, // Export the handler function
};