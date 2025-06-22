import { databases, storage, users, ID, processEnv } from '../config/appwrite1.js';
// Note: No direct Query needed if just performing actions on specific IDs.

const MAIN_DB_ID = processEnv.APPWRITE_DB_ID_MAIN;
const METADATA_COLLECTION_ID = processEnv.APPWRITE_COLL_ID_METADATA;

// Example: Pro user can delete a client and all associated resources
// WARNING: This is a destructive operation and needs careful implementation and testing!
export const deleteClientAndResources = async (req, res) => {
    const { id: clientMetadataDocId } = req.params; // ID of the document in schools_metadata

    // IMPORTANT: IF you have an auth middleware that populates req.user,
    // you SHOULD add a check here to ensure req.user has the 'pro' label.
    // if (!req.user || !req.user.labels || !req.user.labels.includes('pro')) {
    //     return res.status(403).json({ message: 'Forbidden: Pro access required for this operation.' });
    // }

    try {
        // 1. Get client metadata to find DB IDs, Bucket IDs, etc.
        const clientMetadata = await databases.getDocument(MAIN_DB_ID, METADATA_COLLECTION_ID, clientMetadataDocId);

        const {
            db_id, // e.g., db_<domain>
            gallery_bucket_id, // e.g., gall-<domain>
            assignment_bucket_id,
            notes_bucket_id,
            client_admin_user_id, // Appwrite User ID of the client's admin
            logo_image_id // ID of the logo in buck-metadata
        } = clientMetadata;

        // Sequence of deletion (order can matter, e.g., delete users before DBs they have access to if strict)

        // 2. Delete client-specific buckets (and their files)
        if (gallery_bucket_id) await storage.deleteBucket(gallery_bucket_id).catch(e => console.error(`Error deleting bucket ${gallery_bucket_id}:`, e.message));
        if (assignment_bucket_id) await storage.deleteBucket(assignment_bucket_id).catch(e => console.error(`Error deleting bucket ${assignment_bucket_id}:`, e.message));
        if (notes_bucket_id) await storage.deleteBucket(notes_bucket_id).catch(e => console.error(`Error deleting bucket ${notes_bucket_id}:`, e.message));

        // 3. Delete client-specific database (and its collections/documents)
        if (db_id) await databases.delete(db_id).catch(e => console.error(`Error deleting database ${db_id}:`, e.message));

        // 4. Delete the client's admin user
        if (client_admin_user_id) await users.delete(client_admin_user_id).catch(e => console.error(`Error deleting user ${client_admin_user_id}:`, e.message));

        // 5. Delete logo image from buck-metadata if it exists
        if (logo_image_id && processEnv.APPWRITE_BUCKET_ID_METADATA) {
            await storage.deleteFile(processEnv.APPWRITE_BUCKET_ID_METADATA, logo_image_id)
                .catch(e => console.error(`Error deleting logo image ${logo_image_id}:`, e.message));
        }
        
        // 6. Finally, delete the metadata document itself
        await databases.deleteDocument(MAIN_DB_ID, METADATA_COLLECTION_ID, clientMetadataDocId);

        res.status(200).json({ message: `Client ${clientMetadata.name} and associated resources deleted successfully.` });

    } catch (error) {
        console.error(`Error deleting client ${clientMetadataDocId} and resources:`, error.message, error.response?.data);
        if (error.code === 404 && error.message.includes("Document with the requested ID could not be found")) {
             return res.status(404).json({ message: 'Client metadata document not found. Partial deletion might have occurred or ID is incorrect.' });
        }
        res.status(500).json({ message: 'Failed to delete client and resources', error: error.message });
    }
};

// Example: Pro user can forcefully change status of any client
export const forceUpdateClientStatus = async (req, res) => {
    // if (!req.user || !req.user.labels || !req.user.labels.includes('pro')) {
    //     return res.status(403).json({ message: 'Forbidden: Pro access required.' });
    // }
    const { id } = req.params;
    const { status } = req.body; // e.g., "active", "expired", "suspended"

    if (!status || !['active', 'expired', 'pending_setup', 'setup_failed', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Valid status is required (active, expired, pending_setup, setup_failed, suspended).' });
    }

    try {
        const updatedDoc = await databases.updateDocument(
            MAIN_DB_ID,
            METADATA_COLLECTION_ID,
            id,
            { status: status }
        );
        res.json({ message: `Client status updated to ${status}`, client: updatedDoc });
    } catch (error) {
        console.error(`Error force updating status for client ${id}:`, error);
        if (error.code === 404) return res.status(404).json({message: "Client not found"});
        res.status(500).json({ message: 'Failed to force update client status', error: error.message });
    }
};