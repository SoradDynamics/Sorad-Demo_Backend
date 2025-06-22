// server/src/routes/clientRoutes.js (CommonJS Version)
const express = require('express');
const multer = require('multer');
const clientController = require('../controllers/clientController.js'); // Assuming CommonJS export

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Routes using the simplified clientController
router.route('/')
    .get(clientController.getAllClients)
    .post(upload.single('logoImage'), clientController.addClient);

router.route('/:id')
    .get(clientController.getClientById)
    .put(clientController.updateBasicClientInfo); // Uses the renamed function

router.put('/:id/license', clientController.updateClientLicenseDate); // Uses the renamed function
router.post('/:id/notes', clientController.addClientManagerNote);   // Uses the renamed function

module.exports = router;