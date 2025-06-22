// server/src/config/appwrite.js (CommonJS)

///for middleware only

const { Client, Databases, Storage, Users, ID } = require('node-appwrite');
const dotenv = require('dotenv');

dotenv.config();

// This is your primary admin client, used for most operations
const appwriteAdminClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // SERVER ADMIN API KEY

const databases = new Databases(appwriteAdminClient);
const storage = new Storage(appwriteAdminClient);
const users = new Users(appwriteAdminClient); // This 'users' service HAS ADMIN PRIVILEGES

// This client is specifically for JWT verification by the middleware.
// It doesn't need an API key for the setJWT() method.
const verificationClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

const currentProcessEnv = process.env;

module.exports = {
    appwriteAdminClient, // You might rename this to appwriteClient if that's what other files expect
    databases,
    storage,
    users, // This is the admin-powered Users service
    ID,
    verificationClient, // Exported for the middleware
    processEnv: currentProcessEnv
};