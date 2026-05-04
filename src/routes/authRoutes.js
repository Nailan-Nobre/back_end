const express = require('express');
const router = express.Router();
const { 
  signUp,
  resendConfirmation,
  login,
  getUserProfile,
  getUserById,
  getManicureBySlug,
  updateProfile
} = require('../controllers/authController');
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rotas públicas
router.post('/signup', signUp);
router.post('/resend-confirmation', resendConfirmation);
router.post('/login', login);
router.get('/usuario/:id', getUserById);
router.get('/manicure/:slug', getManicureBySlug);

// Rotas protegidas
router.put('/profile', authenticate, updateProfile);
router.post('/upload', authenticate, uploadController.uploadImagem);
router.get('/profile', authenticate, getUserProfile);

module.exports = router;