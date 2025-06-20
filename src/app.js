const express = require('express')
const cors = require('cors')
const userRoutes = require('./routes/userRoutes')
const testRoutes = require('./routes/testRoutes')
const authRoutes = require('./routes/authRoutes') 
const { authenticate } = require('./middlewares/authMiddleware')

// Cria a aplicação Express
const app = express()

// Middlewares
app.use(cors()) 
app.use(express.json())

// Rotas
app.use('/api/users', userRoutes) // Rotas de usuário
app.use('/auth', authRoutes) // Rotas de autenticação
app.use('/api/test', testRoutes) // Rotas de teste (Supabase)

app.get('/protegido', authenticate, (req, res) => {
  res.json({ 
    message: 'Rota protegida!',
    user: req.user 
  })
})

// Rota raiz (opcional)
app.get('/', (req, res) => {
  res.send('API está funcionando!')
})

module.exports = app