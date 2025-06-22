// config/appwrite.js
const { Client, Users, ID, Storage, Databases, AppwriteException } = require('node-appwrite'); // Added Databases and AppwriteException
const dotenv = require('dotenv');
dotenv.config();

// --- Appwrite Client Initialization ---
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT) // Use directly, error check below
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

// --- Environment Variable Check ---
if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
    console.error('FATAL ERROR: Missing required Appwrite environment variables in .env file.');
    console.error('Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
    process.exit(1); // Exit if configuration is incomplete
}

// --- Appwrite Service Initialization ---
const users = new Users(client);
const storage = new Storage(client);
const databases = new Databases(client); // Initialize Databases if needed elsewhere

// --- Export Appwrite services ---
module.exports = {
    client,
    users,
    ID, // Export ID helper
    storage,
    databases, // Export if needed
    AppwriteException // Export for specific error handling
};