const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rotas protegidas por autenticação
router.post('/', authenticate, agendamentoController.criarAgendamento);
router.get('/meus-agendamentos', authenticate, agendamentoController.listarAgendamentosUsuario);
router.get('/pendentes', authenticate, agendamentoController.listarSolicitacoesManicure);
router.get('/confirmados', authenticate, agendamentoController.listarAgendamentosConfirmados);
router.get('/em-andamento', authenticate, agendamentoController.listarAgendamentosEmAndamento);
router.get('/concluidos', authenticate, agendamentoController.listarAgendamentosConcluidos);
router.get('/historico', authenticate, agendamentoController.listarAgendamentosHistorico);
router.patch('/:id/status', authenticate, agendamentoController.atualizarStatusAgendamento);

module.exports = router;