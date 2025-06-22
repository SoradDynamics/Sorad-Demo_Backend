// utils/helpers.js

const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const generateStudentEmail = (studentName, schoolDomain) => {
    const baseName = studentName.trim().toLowerCase().replace(/\s+/g, '');
    const randomChars = generateRandomString(3);
    // Make sure to use a domain you control or a placeholder like example.com
    // Consider making the domain configurable via .env
    
    const domain = process.env.APP_USER_DOMAIN || 'yourappdomain.com';

    const finalDomain = schoolDomain; // <-- USE 'schoolDomain'

    return `${baseName}-${randomChars}@${finalDomain}`;
};

const generatePassword = () => generateRandomString(8); // Minimum length for Appwrite password

module.exports = {
    generateRandomString,
    generateStudentEmail,
    generatePassword,
};