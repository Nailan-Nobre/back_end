const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rota para criar feedback (apenas clientes)
router.post('/', feedbackController.criarFeedback);

// Rota pública para ver feedbacks de uma manicure
router.get('/manicure/:manicureId', feedbackController.getFeedbacksPorManicure);

// Rota protegida para ver detalhes com feedback
router.get('/agendamento/:id', authenticate, feedbackController.getAgendamentoComFeedback);

module.exports = router;