const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rotas protegidas por autenticação
router.post('/', authenticate, agendamentoController.criarAgendamento);
router.get('/', authenticate, agendamentoController.listarAgendamentos);

module.exports = router;