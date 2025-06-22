// controllers/StdUser/signupController.js
const { users, ID, AppwriteException } = require('../../config/appwrite'); // Adjust path to your Appwrite config
const { sendSignupWelcomeEmail } = require('../Mail/mailController'); // Points to the mailController in the parent 'controllers' directory

/**
 * Creates a new generic Appwrite Auth user, sets preferences, and sends a welcome email.
 * Expects email, password, and name in the request body.
 * Optionally accepts an array of 'labels' and a 'domain' string in the request body.
 */
const signupUser = async (req, res) => {
    const { email, password, name, labels, domain } = req.body;

    // --- Basic Input Validation ---
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: email, password, and name are required.',
        });
    }
    if (password.length < 8) { // Example: Basic password strength
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long.',
        });
    }

    const userLabels = Array.isArray(labels) ? labels.filter(l => typeof l === 'string') : [];

    try {
        // --- 1. Create the Appwrite Auth User ---
        //console.log(`Attempting to create user: ${email}`);
        const newUser = await users.create(
            ID.unique(),
            email,
            null, // phone
            password, // Appwrite will hash this
            name
        );
        //console.log(`Successfully created user ${newUser.$id} for email: ${email}`);

        // --- 2. Apply labels if provided ---
        if (userLabels.length > 0) {
            try {
                //console.log(`Attempting to apply labels [${userLabels.join(', ')}] to user ${newUser.$id}`);
                await users.updateLabels(newUser.$id, userLabels);
                //console.log(`Successfully applied labels for user ${newUser.$id}`);
            } catch (labelError) {
                console.error(`Error applying labels to user ${newUser.$id}:`, labelError);
                // Log the error but proceed. User is created.
            }
        } else {
            //console.log(`No labels provided for user ${newUser.$id}. Skipping label update.`);
        }

        // --- 3. Update user preferences with domain if provided ---
        if (domain && typeof domain === 'string') {
            try {
                //console.log(`Attempting to update preferences for user ${newUser.$id} with domain: ${domain}`);
                await users.updatePrefs(newUser.$id, { domain: domain });
                //console.log(`Successfully updated preferences for user ${newUser.$id} with domain.`);
            } catch (prefsError) {
                console.error(`Error updating preferences for user ${newUser.$id}:`, prefsError);
            }
        } else if (domain) {
            console.warn(`Domain provided for user ${newUser.$id} but was not a string: ${domain}. Skipping preferences update.`);
        } else {
            //console.log(`No domain provided for user ${newUser.$id}. Skipping preferences update.`);
        }

        // --- 4. Fetch the user again to get the most up-to-date info ---
        const createdUserData = await users.get(newUser.$id);
        //console.log('User data after all updates:', JSON.stringify(createdUserData, null, 2));

        // --- 5. Send Welcome Email ---
        // Pass the original `password` from req.body.
        //console.log(`Attempting to send welcome email to ${createdUserData.email}`);
        const emailResult = await sendSignupWelcomeEmail(
            createdUserData.email,
            createdUserData.name,
            password // Original password from req.body
            // loginUrl can be passed here if specific to this signup, or rely on APP_LOGIN_URL in mailController
        );

        let emailMessage = "A welcome email has been sent.";
        if (!emailResult.success) {
            console.warn(`Failed to send welcome email to ${createdUserData.email}. Error: ${emailResult.error}`);
            emailMessage = "User created, but failed to send welcome email. Please check server logs.";
        } else {
            //console.log(`Welcome email process initiated for ${createdUserData.email}.`);
        }

        // --- 6. Send Success Response ---
        res.status(201).json({
            success: true,
            message: `User created successfully. ${emailMessage}`,
            userId: createdUserData.$id,
            email: createdUserData.email,
            name: createdUserData.name,
            labels: createdUserData.labels,
            prefs: createdUserData.prefs,
            emailSent: emailResult.success
        });

    } catch (error) {
        console.error('Error creating user:', error);
        if (error instanceof AppwriteException) {
            if (error.code === 409) { // User already exists
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists.',
                    code: error.code,
                });
            }
            // Appwrite error codes for invalid parameters often start with 400
            if (error.code === 400 || (error.code >= 4000 && error.code < 5000 && error.code !== 4009)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid input: ${error.message}`,
                    code: error.code,
                    type: error.type
                });
            }
        }
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred while creating the user.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

module.exports = {
    signupUser,
};