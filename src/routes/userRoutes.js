const express = require('express')
const router = express.Router()
const { 
  getAllUsers, 
  createUser, 
  getUserById, 
  getManicuresComEstrelas, 
  getManicureDetalhes,
  atualizarMediaEstrelas 
} = require('../controllers/userController')

// Rotas para usuários
router.get('/', getAllUsers)                              // GET /users
router.post('/', createUser)                              // POST /users
router.get('/manicures', getManicuresComEstrelas)         // GET /users/manicures
router.get('/:id', getUserById)                           // GET /users/:id
router.get('/manicure/:id', getManicureDetalhes)          // GET /users/manicure/:id
router.put('/:id/estrelas', atualizarMediaEstrelas)       // PUT /users/:id/estrelas

module.exports = router