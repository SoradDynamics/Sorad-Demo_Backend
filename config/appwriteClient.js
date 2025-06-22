// backend/src/config/appwriteClient.js
// (Assuming you have a similar setup)
const sdk = require('node-appwrite');

const client = new sdk.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)      // Your Appwrite Endpoint
    .setProject(process.env.APPWRITE_PROJECT_ID)    // Your project ID
    .setKey(process.env.APPWRITE_API_KEY);          // Your secret API key (NEEDS users.read permission)

const databases = new sdk.Databases(client);
const users = new sdk.Users(client); // This client will be used for fetching user prefs

const masterDatabaseId = process.env.MASTER_DATABASE_ID;
const schoolsMetadataCollectionId = process.env.SCHOOLS_METADATA_COLLECTION_ID;

module.exports = {
    databases,
    users, // Export the Users client
    masterDatabaseId,
    schoolsMetadataCollectionId,
};
