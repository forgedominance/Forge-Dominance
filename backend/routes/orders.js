const express = require('express');
const orderController = require('../controllers/orderController');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const metaCapi = require('../lib/metaCapi');

const router = express.Router();

router.post('/public', async (req, res) => {
	try {
		if (req.body && req.body.website) {
			return res.status(200).json({ success: true, message: 'Order submitted successfully' });
		}
		const { firstName, lastName, email, phone, country, addressLine1, addressLine2, city, state, postalCode, brief, budget, items, ownerRef, couponCode } = req.body || {};
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
		const subtotal = safeItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);

		// Re-validate the coupon against the database rather than trusting any
		// discount the client may have calculated — the client's number is only
		// ever used for display before this point.
		let discount = 0;
		let appliedCoupon = null;
		const code = String(couponCode || '').trim();
		if (code) {
			try {
				const { findCouponByCode, isCouponUsable } = require('./promotions');
				const coupon = await findCouponByCode(code);
				const usable = isCouponUsable(coupon);
				if (usable.ok) {
					discount = coupon.coupon_type === 'fixed'
						? Math.min(Number(coupon.amount || 0), subtotal)
						: subtotal * (Number(coupon.amount || 0) / 100);
					appliedCoupon = { id: coupon.id, code: coupon.code, coupon_type: coupon.coupon_type, amount: coupon.amount };
					// Best-effort usage increment — must never block order creation.
					if (coupon._source === 'coupons') {
					supabase.from('coupons').update({ used_count: Number(coupon.used_count || 0) + 1 }).eq('id', coupon.id)
						.then(() => {})
						.catch((e) => console.warn('[Orders] Coupon usage increment failed (non-blocking):', e));
					}
				}
			} catch (e) {
				console.warn('[Orders] Coupon re-validation failed (non-blocking):', e);
			}
		}

		const total = Math.max(0, (subtotal || Number(budget || 0) || 0) - discount);

		const order = await Order.create({
			customer_id: customer.id,
			status: 'pending',
			total,
			items: {
				source: 'website-whatsapp',
				owner_ref: ownerRef || null,
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
				subtotal,
				discount,
				coupon: appliedCoupon,
				items: safeItems
			}
		});

		res.status(201).json({ message: 'Order lead created', orderId: order.id });

		// Fire Meta Conversions API Purchase event (non-blocking, response already sent)
		metaCapi.sendEvent({
			eventName: 'Purchase',
			req,
			contentIds: safeItems.map(item => String(item.id || item.product_id || '')).filter(Boolean),
			contentType: 'product',
			value: total,
			currency: 'USD',
			email,
			phone,
			eventId: String(order.id)
		}).catch(err => console.error('[MetaCAPI] Purchase failed:', err.message));
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
router.delete('/all', authenticate, authorize('admin'), orderController.deleteAll);
router.delete('/:id', authenticate, authorize('admin'), orderController.delete);

module.exports = router;


