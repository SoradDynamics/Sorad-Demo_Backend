// controllers/signupController.js
const { users, ID, AppwriteException, Query } = require('../../config/appwrite'); // Adjust path to your Appwrite config
const { generateStudentEmail, generatePassword } = require('../../utils/helpers'); // Adjust path to your helpers
const { sendParentStudentCredentialsEmail } = require('../Mail/mailController'); // Points to mailController in the same 'controllers' directory

const handleSignup = async (req, res) => {
    const { isExistingParent, studentName, parentName, parentEmail, domain } = req.body;

    // --- Input Validation ---
    if (!studentName) {
        return res.status(400).json({ success: false, message: 'Student name is required' });
    }
    if (!parentEmail) { // Parent email is always needed for notification
        return res.status(400).json({ success: false, message: 'Parent email is required' });
    }
    if (!isExistingParent && !parentName) {
        return res.status(400).json({ success: false, message: 'Parent name is required for new parent' });
    }
    if (parentEmail && !/\S+@\S+\.\S+/.test(parentEmail)) {
         return res.status(400).json({ success: false, message: 'Invalid parent email format' });
    }
    if (!domain && !process.env.APP_USER_DOMAIN) {
        console.warn("Domain not provided in request or .env for email generation. Relying on helper's fallback.");
    }
    if (studentName.length < 2 || (parentName && parentName.length < 2)) {
         return res.status(400).json({ success: false, message: 'Names must be at least 2 characters long.' });
    }


    let parentUserId = null;
    let studentUserId = null;
    let newlyCreatedParentPassword = null;
    const studentPassword = generatePassword();
    const studentGeneratedEmail = generateStudentEmail(studentName, domain);

    let effectiveParentEmail = parentEmail;
    let effectiveParentName = parentName;
    let createdStudentUser;

    //console.log("--- Parent/Student Signup Request Received ---");
    //console.log("Request Body:", req.body);
    //console.log(`Generated Student Credentials: Email=${studentGeneratedEmail}`);

    try {
        // --- Create or Identify Parent User ---
        if (!isExistingParent) {
            newlyCreatedParentPassword = generatePassword();
            try {
                //console.log(`Attempting to create Parent User: Email=${effectiveParentEmail}, Name=${effectiveParentName}`);
                const parentUser = await users.create(
                    ID.unique(),
                    effectiveParentEmail,
                    null, // phone
                    newlyCreatedParentPassword,
                    effectiveParentName
                );
                parentUserId = parentUser.$id;
                effectiveParentEmail = parentUser.email; // Use confirmed email from Appwrite
                effectiveParentName = parentUser.name;   // Use confirmed name from Appwrite
                //console.log(`Created Parent User: ID=${parentUserId}`);

                await users.updateLabels(parentUserId, ['parent']);
                //console.log(`Updated Parent User ${parentUserId} label to 'parent'`);

                if (domain) {
                    await users.updatePrefs(parentUserId, { domain: domain });
                    //console.log(`Updated Parent User ${parentUserId} preferences with domain: ${domain}`);
                }
            } catch (error) {
                if (error instanceof AppwriteException && error.code === 409) {
                    return res.status(409).json({ success: false, message: `Parent user with email ${effectiveParentEmail} already exists. Please use the 'Existing Parent' option or log in.` });
                }
                console.error('Error creating parent user:', error);
                return res.status(500).json({ success: false, message: 'Failed to create parent user', error: error.message });
            }
        } else {
            //console.log(`Existing parent flow for email: ${effectiveParentEmail}.`);
            if (!effectiveParentName && effectiveParentEmail) {
                try {
                    //console.log(`Fetching existing parent by email: ${effectiveParentEmail} to get name for email.`);
                    const existingParentsList = await users.list([
                        Query.equal('email', effectiveParentEmail)
                    ]);
                    if (existingParentsList.users.length > 0) {
                        const existingParent = existingParentsList.users[0];
                        effectiveParentName = existingParent.name;
                        parentUserId = existingParent.$id; // Important for response
                        //console.log(`Found existing parent: ${effectiveParentName} (ID: ${parentUserId})`);
                    } else {
                        console.warn(`Existing parent selected, but no user found with email ${effectiveParentEmail}.`);
                        // Consider how to handle this case - maybe require parentName if existing and not found
                        effectiveParentName = "Valued Parent"; // Fallback, but less ideal
                    }
                } catch (fetchError) {
                    console.error(`Error fetching existing parent by email ${effectiveParentEmail}:`, fetchError);
                    effectiveParentName = parentName || "Valued Parent"; // Fallback
                }
            } else if (!effectiveParentName) {
                effectiveParentName = "Valued Parent"; // If parentEmail somehow missing for existing parent flow
            }
        }

        // --- Create Student User ---
        try {
            //console.log(`Attempting to create Student User: Email=${studentGeneratedEmail}, Name=${studentName}`);
            createdStudentUser = await users.create(
                ID.unique(),
                studentGeneratedEmail,
                null, // phone
                studentPassword,
                studentName
            );
            studentUserId = createdStudentUser.$id;
            //console.log(`Created Student User: ID=${studentUserId}`);

            await users.updateLabels(studentUserId, ['student']);
            //console.log(`Updated Student User ${studentUserId} label to 'student'`);

            if (domain) {
                await users.updatePrefs(studentUserId, { domain: domain });
                //console.log(`Updated Student User ${studentUserId} preferences with domain: ${domain}`);
            }
        } catch (error) {
            console.error('Error creating student user:', error);
            if (!isExistingParent && parentUserId) { // Only delete if parent was NEWLY created in this request
                 console.warn(`Student creation failed. Deleting newly created parent user ${parentUserId}.`);
                 try {
                     await users.delete(parentUserId);
                     //console.log(`Successfully deleted newly created parent user ${parentUserId}.`);
                 } catch (deleteError) {
                     console.error(`Failed to delete parent user ${parentUserId} during cleanup:`, deleteError);
                 }
            }
            if (error instanceof AppwriteException && error.code === 409) {
                return res.status(409).json({ success: false, message: `A user with the generated student email ${studentGeneratedEmail} already exists. Please try a different student name or check existing users.` });
            }
            return res.status(500).json({ success: false, message: 'Failed to create student user', error: error.message });
        }

        // --- Send Credentials Email to Parent ---
        let emailSentStatus = false;
        if (effectiveParentEmail && effectiveParentName && createdStudentUser) {
            //console.log(`Attempting to send credentials email to parent: ${effectiveParentEmail}`);
            const parentCredentialsForEmail = {
                email: effectiveParentEmail,
                password: newlyCreatedParentPassword, // Will be null if existing parent
            };
            const studentCredentialsForEmail = {
                name: createdStudentUser.name,
                email: createdStudentUser.email,
                password: studentPassword,
            };

            const emailResult = await sendParentStudentCredentialsEmail(
                effectiveParentEmail,
                effectiveParentName,
                parentCredentialsForEmail,
                studentCredentialsForEmail
                // loginUrl can be passed or rely on APP_LOGIN_URL in mailController
            );

            emailSentStatus = emailResult.success;
            if (emailSentStatus) {
                //console.log(`Credentials email sent to parent ${effectiveParentEmail}.`);
            } else {
                console.warn(`Failed to send credentials email to parent ${effectiveParentEmail}. Error: ${emailResult.error}`);
            }
        } else {
            console.warn("Could not send credentials email: Parent email, parent name, or student data missing after processing.");
        }

        // --- Success ---
        //console.log("--- Parent/Student User Creation Process Successful ---");
        res.status(201).json({
            success: true,
            message: `Users created successfully. ${emailSentStatus ? 'Credentials email sent to parent.' : 'Credentials email could not be sent.'}`,
            parentUserId: parentUserId, // ID of newly created or identified existing parent
            studentUserId: studentUserId,
            studentEmail: studentGeneratedEmail,
            emailSent: emailSentStatus,
        });

    } catch (error) {
        console.error('Unhandled error during parent/student signup process:', error);
        if (error instanceof AppwriteException) {
            return res.status(error.code || 500).json({
                success: false,
                message: error.message || 'An Appwrite error occurred during signup.',
                type: error.type,
            });
        }
        res.status(500).json({ success: false, message: 'An unexpected error occurred during signup', error: error.message });
    }
};

module.exports = {
    handleSignup,
};