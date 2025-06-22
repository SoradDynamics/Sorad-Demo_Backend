// backend/src/controllers/schoolController.js
const { databases, users, masterDatabaseId, schoolsMetadataCollectionId } = require('../config/appwriteClient');
const { Query } = require('node-appwrite');

// Internal helper function to get school details from DB by domain
const _getSchoolDetailsFromDB = async (domain) => {
    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
        // //console.log(`[_getSchoolDetailsFromDB] Invalid or empty domain received: '${domain}'`);
        return null; // Or throw an error, depending on desired handling
    }
    // //console.log(`[_getSchoolDetailsFromDB] Querying for domain: ${domain}`);
    const response = await databases.listDocuments(
        masterDatabaseId,
        schoolsMetadataCollectionId,
        [Query.equal('domain', domain.toLowerCase())] // Store and query domains in lowercase for consistency
    );

    if (response.total === 0) {
        // //console.log(`[_getSchoolDetailsFromDB] Domain not found in DB: ${domain}`);
        return null;
    }

    const schoolData = response.documents[0];
    const licenseDate = new Date(schoolData.license_date);
    const now = new Date();
    const licenseStatus = licenseDate < now ? 'expired' : 'valid';

    return {
        db_id: schoolData.db_id,
        school_name: schoolData.name,
        license_status: licenseStatus,
        gallery_bucket_id: schoolData.gallery_bucket_id || null,
        assignment_bucket_id: schoolData.assignment_bucket_id || null,
        notes_bucket_id: schoolData.notes_bucket_id || null,
        by_contact: schoolData.byContact || null,
        // Include the domain that successfully resolved for clarity if needed by frontend
        // resolved_domain: domain, 
    };
};

// Existing endpoint (can remain if you still need direct domain lookup elsewhere)
const getSchoolInfoByDomain = async (req, res) => {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ message: 'Domain is required.' });
    }
    //console.log(`[getSchoolInfoByDomain] Processing direct request for domain: ${domain}`);

    try {
        const schoolInfo = await _getSchoolDetailsFromDB(domain);

        if (!schoolInfo) {
            //console.log(`[getSchoolInfoByDomain] Domain not found: ${domain}`);
            return res.status(404).json({ message: 'School domain not found.' });
        }
        res.json(schoolInfo);
    } catch (error) {
        console.error('[getSchoolInfoByDomain] Error:', error);
        res.status(500).json({ message: 'Error fetching school information.', error: error.message });
    }
};

// NEW Endpoint: Resolves school by email, then by Appwrite user preferences
const resolveSchoolByEmailOrPreferences = async (req, res) => {
    const { userEmail } = req.body; // Expecting 'userEmail'

    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
        return res.status(400).json({ message: 'Valid userEmail is required.' });
    }
    //console.log(`[resolveSchool] Received request for email: ${userEmail}`);

    try {
        // 1. Try with domain from email
        const emailParts = userEmail.split('@');
        const domainFromEmail = emailParts[1]?.toLowerCase();

        if (!domainFromEmail) {
             //console.log(`[resolveSchool] Invalid email format, cannot extract domain: ${userEmail}`);
             return res.status(400).json({ message: 'Invalid email format for domain extraction.' });
        }
        
        //console.log(`[resolveSchool] Attempt 1: Using domain from email: ${domainFromEmail}`);
        let schoolInfo = await _getSchoolDetailsFromDB(domainFromEmail);

        if (schoolInfo) {
            //console.log(`[resolveSchool] Found school using domain from email: ${domainFromEmail} for ${userEmail}`);
            return res.json({ ...schoolInfo, resolved_by: 'email_domain', original_domain_attempted: domainFromEmail });
        }
        //console.log(`[resolveSchool] School not found with domain from email ('${domainFromEmail}'). Checking preferences for ${userEmail}.`);

        // 2. If not found, try with domain from Appwrite user preferences
        let appwriteUser;
        try {
            const userList = await users.list([Query.equal('email', userEmail)]);
            if (userList.total === 0) {
                //console.log(`[resolveSchool] Appwrite user not found for email: ${userEmail}`);
                return res.status(404).json({ message: 'School domain not found, and user email not registered in Appwrite for preference check.' });
            }
            if (userList.total > 1) {
                // This case should ideally not happen if emails are unique constraints in Appwrite Auth
                console.warn(`[resolveSchool] Multiple Appwrite users found for email: ${userEmail}. Using the first one.`);
            }
            appwriteUser = userList.users[0];
        } catch (userListError) {
             console.error(`[resolveSchool] Error fetching Appwrite user by email ${userEmail}:`, userListError);
             // Proceed to 404 as if user not found, rather than 500, unless it's a critical Appwrite client error
             return res.status(404).json({ message: 'School domain not found (error during user lookup for preferences).' });
        }


        const userPrefs = await users.getPrefs(appwriteUser.$id);
        const domainFromPrefs = userPrefs.domain?.toLowerCase(); // Assuming preference key is 'domain'

        if (domainFromPrefs && typeof domainFromPrefs === 'string' && domainFromPrefs.trim() !== '') {
            //console.log(`[resolveSchool] Attempt 2: Found domain in preferences ('${domainFromPrefs}') for user ${userEmail}. Querying...`);
            schoolInfo = await _getSchoolDetailsFromDB(domainFromPrefs);

            if (schoolInfo) {
                //console.log(`[resolveSchool] Found school using domain from preferences: ${domainFromPrefs} for ${userEmail}`);
                return res.json({ ...schoolInfo, resolved_by: 'user_preference', original_domain_attempted: domainFromPrefs });
            } else {
                //console.log(`[resolveSchool] School not found even with domain from preferences ('${domainFromPrefs}') for ${userEmail}.`);
            }
        } else {
            //console.log(`[resolveSchool] No 'domain' found in preferences for user ${userEmail}, or it's invalid.`);
        }

        // 3. If still not found
        //console.log(`[resolveSchool] School not found for ${userEmail} after checking email domain and preferences.`);
        return res.status(404).json({ message: 'School domain not found via email or user preferences.' });

    } catch (error) {
        console.error('[resolveSchool] General error:', error);
        // Distinguish between client error (e.g. bad Appwrite API key) and actual school not found
        if (error.type === 'general_unauthorized_scope' || error.code === 401 || error.code === 403) {
             console.error('[resolveSchool] Appwrite API Key permission error or invalid key for users.read.');
             return res.status(500).json({ message: 'Server configuration error (Appwrite access).', error: 'API key scope issue.' });
        }
        res.status(500).json({ message: 'Error resolving school information.', error: error.message });
    }
};

module.exports = {
    getSchoolInfoByDomain, // Keep if needed
    resolveSchoolByEmailOrPreferences, // Export the new function
};