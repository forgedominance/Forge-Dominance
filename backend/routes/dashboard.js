const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/kpis', authenticate, dashboardController.getKPIs);
router.get('/revenue-chart', authenticate, dashboardController.getRevenueChart);
router.get('/order-status-chart', authenticate, dashboardController.getOrderStatusChart);
router.get('/recent-orders', authenticate, dashboardController.getRecentOrders);
router.get('/analytics', authenticate, dashboardController.getAnalytics);

module.exports = router;


