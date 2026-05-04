const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const agendamentoController = require('./controllers/agendamentoController');
const { authenticate } = require('./middlewares/authMiddleware');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes'); // Nova rota de feedbacks
const analiseRoutes = require('./routes/analiseRoutes');

// Cria a aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const frontendRoot = path.resolve(__dirname, '../../Pretty-Nails');
app.use(express.static(frontendRoot));

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.url.includes('/signup')) {
    console.log('Body do cadastro:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Rotas públicas
app.use('/auth', authRoutes);
app.use('/feedback', feedbackRoutes); // Rota pública para visualizar feedbacks

// Página pública de agendamento por slug
app.get('/agendamento', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'agendamento', 'agendamento.html'));
});

app.get('/agendamento/:slug', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'agendamento', 'agendamento.html'));
});

app.post('/api/agendamentos/public', agendamentoController.criarAgendamento);

// Rotas protegidas
app.use('/api/users', authenticate, userRoutes);
app.use('/api/agendamentos', authenticate, agendamentoRoutes);
app.use('/api/feedbacks', authenticate, feedbackRoutes); // Rota protegida para criar feedbacks
app.use('/api/analise', authenticate, analiseRoutes);

// Rota protegida de exemplo
app.get('/protegido', authenticate, (req, res) => {
  res.json({ 
    message: 'Rota protegida!',
    user: req.user 
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.send('API está funcionando!');
});

module.exports = app;