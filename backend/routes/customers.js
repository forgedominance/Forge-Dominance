const express = require('express');
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, customerController.getAll);
router.get('/:id', authenticate, customerController.getById);
router.post('/', authenticate, authorize('admin'), customerController.create);
router.put('/:id', authenticate, authorize('admin'), customerController.update);
router.delete('/:id', authenticate, authorize('admin'), customerController.delete);
router.post('/:id/notes', authenticate, customerController.addNote);

module.exports = router;


