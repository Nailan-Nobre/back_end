const express = require('express');
const router = express.Router();
const analiseController = require('../controllers/analiseController');

// Rota simplificada sem autenticação
router.get('/', analiseController.getAnalyticsData);

module.exports = router;