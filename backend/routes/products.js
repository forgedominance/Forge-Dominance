const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', productController.getAll);
router.get('/featured', productController.getFeatured);
router.get('/category/:category', productController.getByCategory);
router.put('/sort-order', authenticate, authorize('admin'), productController.updateSortOrder);
router.get('/:id', productController.getById);
router.post('/', authenticate, authorize('admin'), productController.create);
router.put('/:id', authenticate, authorize('admin'), productController.update);
router.delete('/:id', authenticate, authorize('admin'), productController.delete);

module.exports = router;
