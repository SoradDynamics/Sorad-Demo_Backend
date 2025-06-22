// controllers/StdUser/deleteControllers.js
const { users, AppwriteException } = require('../../config/appwrite');

/**
 * Deletes an Appwrite Auth user by their Appwrite User ID.
 * Expects userId in the request parameters. (Generic)
 */
const deleteUser = async (req, res) => { // Renamed function
    const { userId } = req.params;

    // --- Basic Input Validation ---
    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'Missing required route parameter: userId.',
        });
    }

    try {
        // --- Delete the Appwrite Auth User ---
        // //console.log(`Attempting to delete user: ${userId}`);
        await users.delete(userId);
        // //console.log(`Successfully deleted user: ${userId}`);

        // --- Send Success Response ---
        res.status(200).json({
            success: true,
            message: `User ${userId} deleted successfully.`,
        });

    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);

        // --- Handle Specific Appwrite Errors ---
        if (error instanceof AppwriteException) {
            if (error.code === 404) { // User not found
                return res.status(404).json({
                    success: false,
                    message: `User with ID ${userId} not found.`,
                    code: error.code,
                });
            }
        }

        // --- Generic Server Error ---
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred while deleting the user.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

module.exports = {
    deleteUser, // Export the generalized function
};