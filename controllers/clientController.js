// server/src/controllers/clientController.js (CommonJS)

const {
    databases,
    storage, // This 'storage' service uses the Admin API Key from config/appwrite.js
    users,   // This 'users' service also uses the Admin API Key
    ID,
    processEnv
} = require('../config/appwrite1.js'); // Ensure this path is correct
const { Query, Permission, Role, InputFile } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// --- Helper Functions from original code ---

const SCHEMA_FILE_PATH = path.resolve(__dirname, 'appwrite_schema.json');

const loadSchema = (schemaFilePath = SCHEMA_FILE_PATH) => {
    if (!fs.existsSync(schemaFilePath)) {
        throw new Error(`Schema file not found at ${schemaFilePath}`);
    }
    const schemaData = fs.readFileSync(schemaFilePath, 'utf8');
    return JSON.parse(schemaData);
};

// NOTE: You still have two 'waitForAttribute' functions. Consider consolidating.
async function waitForAttribute(databaseId, collectionId, attributeKey, retries = 10, delay = 2500) {
    //console.log(`[waitForAttributeV1] Waiting for attribute '${attributeKey}' in coll '${collectionId}' (DB: ${databaseId}). Attempt ${11 - retries}/10.`);
    for (let i = 0; i < retries; i++) {
        try {
            await databases.getAttribute(databaseId, collectionId, attributeKey);
            // console.log(`[waitForAttributeV1] Attribute '${attributeKey}' found in coll '${collectionId} and db id. '${databaseId}'.`);
            return;
        } catch (error) {
            // @ts-ignore
            if (error.code === 404 || (error.response && error.response.status === 404)) {
                if (i === retries - 1) {
                    const timeoutError = new Error(`Attribute '${attributeKey}' in coll '${collectionId}' (DB: ${databaseId}) not available after ${retries} retries. Last error: ${error.message}`);
                    // @ts-ignore
                    timeoutError.code = 'ATTRIBUTE_POLL_TIMEOUT';
                    throw timeoutError;
                }
                //console.log(`[waitForAttributeV1] Attr '${attributeKey}' not yet available. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`[waitForAttributeV1] Error checking attr '${attributeKey}':`, error.message);
                throw error;
            }
        }
    }
}

async function createAttribute(dbId, collId, attr) {
    //console.log(`[createAttribute] Creating attr '${attr.key}' (type: ${attr.type}, array: ${!!attr.array}) for coll '${collId}'`);
    const { key, type, required, array, size, min, max, default: defaultValue, format, options } = attr;
    try {
        switch (type.toLowerCase()) {
            case 'string':
                if (format === 'enum' && options && options.length > 0) {
                    await databases.createEnumAttribute(dbId, collId, key, options, required, defaultValue, array);
                } else if (format === 'email') {
                    await databases.createEmailAttribute(dbId, collId, key, required, defaultValue, array);
                } else if (format === 'url') {
                    await databases.createUrlAttribute(dbId, collId, key, required, defaultValue, array);
                } else if (format === 'ip') {
                    await databases.createIpAttribute(dbId, collId, key, required, defaultValue, array);
                }
                else {
                    await databases.createStringAttribute(dbId, collId, key, size, required, defaultValue, array);
                }
                break;
            case 'integer':
                await databases.createIntegerAttribute(dbId, collId, key, required, min, max, defaultValue, array);
                break;
            case 'double':
                await databases.createFloatAttribute(dbId, collId, key, required, min, max, defaultValue, array);
                break;
            case 'boolean':
                await databases.createBooleanAttribute(dbId, collId, key, required, defaultValue, array);
                break;
            case 'datetime':
                await databases.createDatetimeAttribute(dbId, collId, key, required, defaultValue, array);
                break;
            default:
                console.warn(`[createAttribute] Unsupported attribute type '${type}' for key '${key}'. Attempting as string.`);
                await databases.createStringAttribute(dbId, collId, key, size || 255, required, defaultValue, array);
        }
        await waitForAttribute(dbId, collId, key);
        //console.log(`[createAttribute] Attr '${key}' for coll '${collId}' created and confirmed.`);
    } catch (error) {
        console.error(`[createAttribute] FAILED to create attr '${key}' for coll '${collId}':`, error.message);
        // @ts-ignore
        if (error.code === 409 || (error.response && error.response.status === 409 && error.message.toLowerCase().includes('already exists'))) {
            console.warn(`[createAttribute] Attr '${key}' already exists in coll '${collId}'. Skipping creation.`);
        } else {
            throw error;
        }
    }
}

async function createIndex(dbId, collId, indexInfo) {
    //console.log(`[createIndex] Creating index '${indexInfo.key}' (type: ${indexInfo.type}) for coll '${collId}'`);
    try {
        await databases.createIndex(dbId, collId, indexInfo.key, indexInfo.type, indexInfo.attributes, indexInfo.orders || []);
        await new Promise(resolve => setTimeout(resolve, 1000));
        //console.log(`[createIndex] Index '${indexInfo.key}' for coll '${collId}' created.`);
    } catch (error) {
        console.error(`[createIndex] FAILED to create index '${indexInfo.key}' for coll '${collId}':`, error.message);
        // @ts-ignore
        if (error.code === 409 || (error.response && error.response.status === 409 && error.message.toLowerCase().includes('already exists'))) {
            console.warn(`[createIndex] Index '${indexInfo.key}' already exists in coll '${collId}'. Skipping creation.`);
        } else {
             // @ts-ignore
            if (error.message && error.message.toLowerCase().includes('attribute not found')) {
                console.error(`[createIndex] DETAIL: Index creation for '${indexInfo.key}' failed likely because one of its attributes [${indexInfo.attributes.join(', ')}] was not found or not yet available. Check schema definition.`);
            }
            throw error;
        }
    }
}

// Second definition of waitForAttribute (consider removing one)
async function waitForAttributeV2(databaseId, collectionId, attributeKey, retries = 7, initialDelay = 500, factor = 1.5) {
    let currentDelay = initialDelay;
    //console.log(`[waitForAttributeV2] Starting poll for attribute '${attributeKey}' in ${databaseId}.${collectionId}. Max retries: ${retries}`);
    for (let i = 0; i < retries; i++) {
        try {
            //console.log(`[waitForAttributeV2] Attempt ${i + 1}/${retries}: Checking attribute '${attributeKey}'...`);
            await databases.getAttribute(databaseId, collectionId, attributeKey);
            //console.log(`[waitForAttributeV2] Attribute '${attributeKey}' confirmed available (attempt ${i + 1}).`);
            return true;
        } catch (error) {
            // @ts-ignore
            if (error.code === 404 || (error.message && error.message.toLowerCase().includes('attribute not found'))) {
                console.warn(`[waitForAttributeV2] Attribute '${attributeKey}' not found (attempt ${i + 1}/${retries}). Waiting ${currentDelay}ms...`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                    currentDelay = Math.min(Math.floor(currentDelay * factor), 5000);
                }
            } else {
                console.error(`[waitForAttributeV2] Unexpected error checking attribute '${attributeKey}' (attempt ${i + 1}/${retries}):`, error.message);
                if (error.response && error.response.data) {
                    console.error("[waitForAttributeV2] Appwrite Error Response:", error.response.data);
                }
                throw error;
            }
        }
    }
    const pollError = new Error(`Attribute '${attributeKey}' was not available in ${databaseId}.${collectionId} after ${retries} retries and polling.`);
    // @ts-ignore
    pollError.code = 'ATTRIBUTE_POLL_TIMEOUT';
    console.error(`[waitForAttributeV2] Polling timed out for attribute '${attributeKey}'. It could not be confirmed.`);
    throw pollError;
}


const isDomainUnique = async (domain) => {
    if (!processEnv.APPWRITE_DB_ID_MAIN || !processEnv.APPWRITE_COLL_ID_METADATA) {
        console.error("[isDomainUnique] Missing Main DB ID or Metadata Collection ID in .env.");
        throw new Error("Server configuration error for domain uniqueness check.");
    }
    try {
        const existing = await databases.listDocuments(
            processEnv.APPWRITE_DB_ID_MAIN,
            processEnv.APPWRITE_COLL_ID_METADATA,
            [Query.equal('domain', domain), Query.limit(1)]
        );
        return existing.total === 0;
    } catch (error) {
        console.error("[isDomainUnique] Error:", error.message);
        throw error;
    }
};

// --- Updated Helper Function to Generate Permission Strings ---
/**
 * Generates an array of Appwrite permission strings based on schema definition.
 * Supports Role.label() and Role.any().
 * @param {Array<{label: string, actions: string[]}>|undefined} collectionSchemaPermissions - The permissions array from the schema.
 * @param {string} collectionNameForLog - Name of the collection for logging purposes.
 * @returns {string[]} Array of Appwrite permission strings.
 */
function generatePermissionsArray(collectionSchemaPermissions, collectionNameForLog = 'unknown') {
    const permissionsArray = [];

    if (collectionSchemaPermissions === undefined || !Array.isArray(collectionSchemaPermissions)) {
        console.warn(`[generatePermissionsArray] No 'permissions' array found or invalid for collection '${collectionNameForLog}'. Defaulting to 'admin' label full CRUD.`);
        const adminRoleForClient = Role.label('admin');
        permissionsArray.push(Permission.read(adminRoleForClient));
        permissionsArray.push(Permission.create(adminRoleForClient));
        permissionsArray.push(Permission.update(adminRoleForClient));
        permissionsArray.push(Permission.delete(adminRoleForClient));
        return permissionsArray;
    }

    if (collectionSchemaPermissions.length === 0) {
        //console.log(`[generatePermissionsArray] Empty 'permissions' array provided for collection '${collectionNameForLog}'. No specific role permissions will be set (server/API key access only).`);
        return [];
    }

    for (const rule of collectionSchemaPermissions) {
        if (!rule.label || typeof rule.label !== 'string' || !rule.actions || !Array.isArray(rule.actions)) {
            console.warn(`[generatePermissionsArray] Invalid permission rule structure in schema for collection '${collectionNameForLog}':`, rule, `Skipping.`);
            continue;
        }

        let roleTarget;
        if (rule.label.toLowerCase() === 'any') {
            roleTarget = Role.any();
            //console.log(`[generatePermissionsArray] Applying Role.any() for collection '${collectionNameForLog}' with actions: ${rule.actions.join(', ')}`);
        } else {
            roleTarget = Role.label(rule.label);
        }

        for (const action of rule.actions) {
            const actionLower = typeof action === 'string' ? action.toLowerCase() : '';
            if (actionLower === 'read') permissionsArray.push(Permission.read(roleTarget));
            else if (actionLower === 'create') permissionsArray.push(Permission.create(roleTarget));
            else if (actionLower === 'update') permissionsArray.push(Permission.update(roleTarget));
            else if (actionLower === 'delete') permissionsArray.push(Permission.delete(roleTarget));
            else {
                console.warn(`[generatePermissionsArray] Unknown or invalid action '${action}' for target '${rule.label}' in collection '${collectionNameForLog}'. Skipping.`);
            }
        }
    }
    
    if (permissionsArray.length === 0 && collectionSchemaPermissions.length > 0) {
        console.warn(`[generatePermissionsArray] All permission rules for collection '${collectionNameForLog}' were invalid or resulted in no Appwrite permissions. Resulting permissions array is empty. This might restrict access more than intended.`);
    }

    return permissionsArray;
}


// --- Controller Functions ---

const addClient = async (req, res) => {
    const creatorId = req.user && req.user.$id ? req.user.$id : 'system_default';
    const { name, desc, domain, admin_name, license_date, byName, byContact } = req.body;
    const logoImageFile = req.file;

    if (!name || !domain || !admin_name || !license_date) return res.status(400).json({ message: 'Name, domain, admin_name, and license_date are required.' });
    if (admin_name.includes(' ')) return res.status(400).json({ message: 'Admin name cannot contain spaces.' });
    const parsedLicenseDate = new Date(license_date);
    if (isNaN(parsedLicenseDate.getTime())) return res.status(400).json({ message: 'Invalid license_date format.' });

    let schemaDefinitions;
    try {
        schemaDefinitions = loadSchema();
    } catch (error) {
        console.error("[addClient] Failed to load schema definitions:", error.message);
        return res.status(500).json({ message: "Internal server error: Could not load schema definitions." });
    }

    try {
        //console.log(`[addClient] User ${creatorId} initiating creation for domain: ${domain}, name: ${name}`);
        if (!(await isDomainUnique(domain))) {
            return res.status(400).json({ message: `Domain '${domain}' already exists.` });
        }
        //console.log(`[addClient] Domain '${domain}' is unique.`);

        let logo_image_id = null;
        if (logoImageFile) {
            //console.log(`[addClient] Logo file received: ${logoImageFile.originalname}`);
            if (!processEnv.APPWRITE_BUCKET_ID_METADATA) {
                console.warn("[addClient] APPWRITE_BUCKET_ID_METADATA missing. Skipping logo upload.");
            } else if (typeof InputFile === 'undefined' || typeof InputFile.fromBuffer !== 'function') {
                console.error("[addClient] CRITICAL: Appwrite SDK's InputFile.fromBuffer is not available. Update 'node-appwrite' SDK (e.g., v10+). Skipping logo.");
            } else {
                try {
                    const inputFilePayload = InputFile.fromBuffer(logoImageFile.buffer, logoImageFile.originalname);
                    const uploadedFile = await storage.createFile(
                        processEnv.APPWRITE_BUCKET_ID_METADATA, ID.unique(), inputFilePayload
                    );
                    logo_image_id = uploadedFile.$id;
                    //console.log(`[addClient] Logo uploaded: ${logo_image_id}`);
                } catch (uploadError) {
                    console.error("[addClient] Error uploading logo:", uploadError.message);
                    if (uploadError.response) console.error("[addClient] Appwrite Storage Error:", uploadError.response.data);
                }
            }
        } else {
            //console.log("[addClient] No logo image provided.");
        }

        const clientDbId = `db_${domain}`;
        try {
            await databases.create(clientDbId, `Client DB ${name} (${domain})`);
            //console.log(`[addClient] DB created: ${clientDbId}`);
        } catch (dbError) {
             // @ts-ignore
            if (dbError.code === 409 || (dbError.response && dbError.response.status === 409)) {
                console.warn(`[addClient] Database '${clientDbId}' already exists. Proceeding...`);
            } else {
                throw dbError;
            }
        }

        for (const schemaItem of schemaDefinitions) {
            const collectionConfig = schemaItem.collection;
            if (!collectionConfig || !collectionConfig.id || !collectionConfig.name) {
                console.warn('[addClient] Invalid collection schema item. Missing id or name. Skipping:', schemaItem);
                continue;
            }
            const collectionId = collectionConfig.id;
            const collectionName = collectionConfig.name;
            
            //console.log(`[addClient] Processing collection: ${collectionName} (ID: ${collectionId}) in DB ${clientDbId}`);

            const collectionSpecificPermissions = generatePermissionsArray(collectionConfig.permissions, collectionName);
            const documentSecurity = typeof collectionConfig.documentSecurity === 'boolean' ? collectionConfig.documentSecurity : true;

            try {
                await databases.createCollection(
                    clientDbId,
                    collectionId,
                    collectionName,
                    collectionSpecificPermissions,
                    documentSecurity
                );
                //console.log(`[addClient] Collection '${collectionName}' (ID: ${collectionId}) created with custom permissions (docSecurity=${documentSecurity}). Permissions: ${JSON.stringify(collectionSpecificPermissions.length > 0 ? collectionSpecificPermissions : "Server/API Key Only")}`);
            } catch (collError) {
                // @ts-ignore
                if (collError.code === 409 || (collError.response && collError.response.status === 409)) {
                    console.warn(`[addClient] Collection '${collectionName}' (ID: ${collectionId}) already exists. Skipping creation.`);
                } else {
                    console.error(`[addClient] Failed to create collection '${collectionName}' (ID: ${collectionId}):`, collError.message);
                    if (collError.response) console.error("Appwrite Error:", collError.response.data);
                    throw collError;
                }
            }

            for (const attribute of schemaItem.attributes) {
                await createAttribute(clientDbId, collectionId, attribute);
            }

            if (schemaItem.indexes && schemaItem.indexes.length > 0) {
                for (const index of schemaItem.indexes) {
                    await createIndex(clientDbId, collectionId, index);
                }
            } else {
                //console.log(`[addClient] No indexes defined for collection '${collectionName}' (ID: ${collectionId}).`);
            }
            //console.log(`[addClient] Finished processing collection: ${collectionName} (ID: ${collectionId})`);
        }
        //console.log(`[addClient] All collections, attributes, and indexes processed for DB ${clientDbId}.`);

        const galleryBucketId = `gall-${domain}`;
        const assignmentBucketId = `assignment-${domain}`;
        const notesBucketId = `notes-${domain}`;
        
        const clientAdminRole = Role.label('admin');
        const clientStudentRole = Role.label('student');
        const clientTeacherRole = Role.label('teacher');
        const clientParentRole = Role.label('parent');

        const defaultBucketPermissions = [
            Permission.read(clientAdminRole), Permission.create(clientAdminRole),
            Permission.update(clientAdminRole), Permission.delete(clientAdminRole),
            Permission.read(clientStudentRole), Permission.create(clientStudentRole),
            Permission.read(clientTeacherRole), Permission.create(clientTeacherRole), Permission.update(clientTeacherRole),
            Permission.read(clientParentRole)
            // Consider adding Role.any() here if some buckets need public read, e.g.,
            // Permission.read(Role.any()) 
        ];
        
        const bucketOptions = { fileSecurity: false, enabled: true, encryption: false, antivirus: false };

        try {
            await storage.createBucket(galleryBucketId, `Gallery for ${name}`, defaultBucketPermissions, bucketOptions.fileSecurity, bucketOptions.enabled, undefined, ['jpg', 'jpeg', 'png', 'gif', 'webp'], undefined, bucketOptions.encryption, bucketOptions.antivirus);
            //console.log(`[addClient] Bucket ${galleryBucketId} created.`);
            await storage.createBucket(assignmentBucketId, `Assignments for ${name}`, defaultBucketPermissions, bucketOptions.fileSecurity, bucketOptions.enabled, undefined, ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'], undefined, bucketOptions.encryption, bucketOptions.antivirus);
            //console.log(`[addClient] Bucket ${assignmentBucketId} created.`);
            await storage.createBucket(notesBucketId, `Notes for ${name}`, defaultBucketPermissions, bucketOptions.fileSecurity, bucketOptions.enabled, undefined, ['pdf', 'doc', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg'], undefined, bucketOptions.encryption, bucketOptions.antivirus);
            //console.log(`[addClient] Bucket ${notesBucketId} created.`);
        } catch (bucketError) {
            console.error(`[addClient] Error creating buckets: `, bucketError.message);
        }

        const clientAdminEmail = `${admin_name}@${domain}`;
        const clientAdminPasswordGenerated = ID.unique();
        const clientAdminAppwriteUser = await users.create(ID.unique(), clientAdminEmail, null, clientAdminPasswordGenerated, name);
        await users.updateLabels(clientAdminAppwriteUser.$id, ['admin']);
        //console.log(`[addClient] Client admin user ${clientAdminEmail} created and assigned 'admin' label.`);

        //For lib user
        const clientLibEmail = `library@${domain}`;
        const clientLibPasswordGenerated = ID.unique();
        const clientLibAppwriteUser = await users.create(ID.unique(), clientLibEmail, null, clientLibPasswordGenerated, `library ${domain}`);
        await users.updateLabels(clientLibAppwriteUser.$id, ['library']);
        //console.log(`[addClient] Client library user ${clientLibEmail} created and assigned 'library' label.`);

        const newClientMetadata = {
            name, desc: desc || '', admin_name, domain, db_id: clientDbId,
            gallery_bucket_id: galleryBucketId, assignment_bucket_id: assignmentBucketId,
            notes_bucket_id: notesBucketId, by: creatorId,
            license_date: parsedLicenseDate.toISOString(), logo_image_id: logo_image_id,
            status: 'active', client_admin_user_id: clientAdminAppwriteUser.$id,
            client_notes: [],
            byName, byContact
        };
        const createdDocument = await databases.createDocument(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA,
            ID.unique(), newClientMetadata
        );
        //console.log(`[addClient] Client ${name} (${domain}) fully provisioned by ${creatorId}. Doc ID: ${createdDocument.$id}, Logo ID: ${logo_image_id}`);

        res.status(201).json({
            message: `Client '${name}' added successfully. Collections created with custom permissions.`,
            client: createdDocument,
            adminPassword: clientAdminPasswordGenerated,
            libPassword: clientLibPasswordGenerated
        });
    } catch (error) {
        console.error(`[addClient] CRITICAL ERROR for domain '${domain}':`, error.message, error.stack);
        if (error.response) console.error("[addClient] Appwrite Error Response:", error.response.data);
        
        let responseMessage = `Failed to add client '${name}'. Error: ${error.message}`;
        // @ts-ignore
        if (error.code === 'ATTRIBUTE_POLL_TIMEOUT') {
            responseMessage = `Failed to add client '${name}'. An attribute required for setup was not available after multiple checks. Please try again or check server logs. Details: ${error.message}`;
        }
        res.status(500).json({ message: responseMessage });
    }
};

const getAllClients = async (req, res) => {
    try {
        const queries = [];
        if (req.query.name) queries.push(Query.search('name', req.query.name.trim()));
        if (req.query.status) queries.push(Query.equal('status', req.query.status.trim()));
        queries.push(Query.orderDesc('$createdAt'));

        const clientDocs = await databases.listDocuments(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA,
            queries.length > 0 ? queries : undefined
        );
        res.json(clientDocs.documents);
    } catch (error) {
        console.error("[getAllClients] Error:", error.message);
        res.status(500).json({ message: 'Failed to fetch clients.', error: error.message });
    }
};

const getClientById = async (req, res) => {
    const { id: clientId } = req.params;
    if (!clientId) return res.status(400).json({ message: 'Client ID required.' });
    try {
        const clientDoc = await databases.getDocument(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA, clientId
        );
        res.json(clientDoc);
    } catch (error) {
        console.error(`[getClientById] Error for ID ${clientId}:`, error.message);
        // @ts-ignore
        if (error.code === 404) return res.status(404).json({ message: "Client not found." });
        res.status(500).json({ message: 'Failed to fetch client details.', error: error.message });
    }
};

const updateBasicClientInfo = async (req, res) => {
    const { id: clientId } = req.params;
    const { name, desc } = req.body;
    if (!clientId) return res.status(400).json({ message: 'Client ID required.' });

    const updateData = {};
    if (typeof name === 'string') updateData.name = name;
    if (typeof desc === 'string') updateData.desc = desc;
    if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No fields to update." });

    try {
        const updatedDoc = await databases.updateDocument(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA, clientId, updateData
        );
        res.json(updatedDoc);
    } catch (error) {
        console.error(`[updateBasicClientInfo] Error for ID ${clientId}:`, error.message);
        // @ts-ignore
        if (error.code === 404) return res.status(404).json({ message: "Client not found." });
        res.status(500).json({ message: 'Failed to update client info.', error: error.message });
    }
};

const updateClientLicenseDate = async (req, res) => {
    const { id: clientId } = req.params;
    const { license_date } = req.body;
    if (!clientId) return res.status(400).json({ message: 'Client ID required.' });
    if (!license_date) return res.status(400).json({ message: 'license_date required.' });
    const newLicenseDate = new Date(license_date);
    if (isNaN(newLicenseDate.getTime())) return res.status(400).json({ message: 'Invalid license_date.' });

    try {
        const currentDate = new Date(); currentDate.setHours(0,0,0,0);
        const normalizedNewLicenseDate = new Date(newLicenseDate); normalizedNewLicenseDate.setHours(0,0,0,0);
        const newStatus = normalizedNewLicenseDate >= currentDate ? 'active' : 'expired';
        
        const updatedDoc = await databases.updateDocument(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA, clientId,
            { license_date: newLicenseDate.toISOString(), status: newStatus }
        );
        res.json(updatedDoc);
    } catch (error) {
        console.error(`[updateClientLicenseDate] Error for ID ${clientId}:`, error.message);
        // @ts-ignore
        if (error.code === 404) return res.status(404).json({ message: "Client not found." });
        res.status(500).json({ message: 'Failed to update license date.', error: error.message });
    }
};

const addClientManagerNote = async (req, res) => {
    const { id: clientId } = req.params;
    const { note } = req.body;
    const managerIdString = req.user && req.user.$id ? ` (by ${req.user.$id})` : '';

    if (!clientId) return res.status(400).json({ message: 'Client ID required.' });
    if (!note || typeof note !== 'string' || note.trim() === '') return res.status(400).json({ message: 'Note content required.' });

    try {
        const clientDoc = await databases.getDocument(processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA, clientId);
        
        const notePrefix = `${new Date().toISOString()}${managerIdString}: `;
        const newNoteEntry = `${notePrefix}${note.trim()}`;
        const updatedNotes = [...(clientDoc.client_notes || []), newNoteEntry];

        const updatedDoc = await databases.updateDocument(
            processEnv.APPWRITE_DB_ID_MAIN, processEnv.APPWRITE_COLL_ID_METADATA, clientId,
            { client_notes: updatedNotes }
        );
        res.json(updatedDoc);
    } catch (error) {
        console.error(`[addClientManagerNote] Error for ID ${clientId}:`, error.message);
        // @ts-ignore
        if (error.code === 404) return res.status(404).json({ message: "Client not found." });
        res.status(500).json({ message: 'Failed to add note.', error: error.message });
    }
};

module.exports = {
    addClient,
    getAllClients,
    getClientById,
    updateBasicClientInfo,
    updateClientLicenseDate,
    addClientManagerNote
};