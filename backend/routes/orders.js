const express = require('express');
const orderController = require('../controllers/orderController');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/public', async (req, res) => {
	try {
		if (req.body && req.body.website) {
			return res.status(200).json({ success: true, message: 'Order submitted successfully' });
		}
		const { firstName, lastName, email, phone, country, addressLine1, addressLine2, city, state, postalCode, brief, budget, items } = req.body || {};
		if (!firstName || !lastName || !email) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		let customer = await Customer.findByEmail(email);
		const customerData = {
			name: `${firstName} ${lastName}`.trim(),
			email,
			phone: phone || null,
			address: addressLine1 || null,
			address_line2: addressLine2 || null,
			city: city || null,
			state: state || null,
			zip: postalCode || null,
			country: country || null
		};

		if (!customer) {
			customer = await Customer.create({
				...customerData
			});
		} else {
			await Customer.update(customer.id, customerData);
		}

		const safeItems = Array.isArray(items) ? items : [];
		const total = safeItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);

		const order = await Order.create({
			customer_id: customer.id,
			status: 'pending',
			total: total || Number(budget || 0) || 0,
			items: {
				source: 'website-whatsapp',
				brief: brief || '',
				budget,
				firstName,
				lastName,
				email,
				phone: phone || null,
				country: country || null,
				addressLine1: addressLine1 || null,
				addressLine2: addressLine2 || null,
				city: city || null,
				state: state || null,
				postalCode: postalCode || null,
				items: safeItems
			}
		});

		res.status(201).json({ message: 'Order lead created', orderId: order.id });
	} catch (error) {
		console.error('[Orders] Error:', error);
	res.status(500).json({ error: 'An internal server error occurred' });
	}
});

router.get('/', authenticate, orderController.getAll);
router.get('/status/:status', authenticate, orderController.getByStatus);
router.get('/:id', authenticate, orderController.getById);
router.post('/', authenticate, authorize('admin'), orderController.create);
router.put('/:id', authenticate, authorize('admin'), orderController.update);
router.patch('/:id/status', authenticate, authorize('admin'), orderController.updateStatus);
router.delete('/:id', authenticate, authorize('admin'), orderController.delete);

module.exports = router;
