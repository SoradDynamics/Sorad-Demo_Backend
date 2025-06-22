//for client only


const { Client, Databases, Storage, Users, ID } = require('node-appwrite');
const dotenv = require('dotenv');

dotenv.config();

const appwriteClient = new Client() // This is your general admin client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);
const storage = new Storage(appwriteClient);
const users = new Users(appwriteClient); // This 'users' service uses the admin key

// Client specifically for verifying JWTs from frontend sessions (doesn't need admin key for setJWT)
const verificationClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

const currentProcessEnv = process.env;

module.exports = {
    appwriteClient, // General admin client
    databases,
    storage,
    users,          // Admin users service
    ID,
    verificationClient, // Client for JWT verification
    processEnv: currentProcessEnv
};