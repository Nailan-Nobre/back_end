const express = require('express')
const router = express.Router()
const { 
  signUp,
  login,
  getManicures,
  getUserProfile,
  getUserById,
  getManicureById
} = require('../controllers/authController')
const { updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware')

// Rotas públicas
router.post('/signup', signUp)
router.post('/login', login)
router.get('/usuario/:id', getUserById)

// Rotas protegidas
router.put('/profile', authenticate, updateProfile);
router.get('/profile', authenticate, getUserProfile)
router.get('/manicures', authenticate, getManicures)
router.get('/manicures/:id', authenticate, getManicureById)

module.exports = router