const express = require('express')
const router = express.Router()
const { 
  signUp,
  login,
  getUserProfile
} = require('../controllers/authController')
const { authenticate } = require('../middlewares/authMiddleware')

// Rotas públicas
router.post('/signup', signUp)
router.post('/login', login)

// Rota protegida (requer token JWT válido)
router.get('/profile', authenticate, getUserProfile)

module.exports = router