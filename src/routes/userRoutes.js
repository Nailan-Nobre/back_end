const express = require('express')
const router = express.Router()
const { getAllUsers, createUser } = require('../controllers/userController')

// Rotas para usuários
router.get('/', getAllUsers)       // GET /users
router.post('/', createUser)       // POST /users

module.exports = router