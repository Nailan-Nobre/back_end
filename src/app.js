const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const { authenticate } = require('./middlewares/authMiddleware');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes'); // Nova rota de feedbacks
const analiseRoutes = require('./routes/analiseRoutes');

// Cria a aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas públicas
app.use('/auth', authRoutes);

// Rotas protegidas
app.use('/api/users', authenticate, userRoutes);
app.use('/api/agendamentos', authenticate, agendamentoRoutes);
app.use('/api/feedbacks', authenticate, feedbackRoutes); // Nova rota para feedbacks
app.use('/api/analise', authenticate, analiseRoutes);

// Rotas de teste (protegidas ou não conforme necessidade)
app.use('/api/test', testRoutes);

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