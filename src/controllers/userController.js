const User = require('../models/User')

// Buscar todos os usuários
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll()
    res.status(200).json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    res.status(500).json({ 
      success: false,
      error: "Erro ao buscar usuários",
      details: error.message
    })
  }
}

// Criar um novo usuário
exports.createUser = async (req, res) => {
  const { name, email } = req.body
  try {
    const newUser = await User.create({ name, email })
    res.status(201).json({
      success: true,
      user: newUser
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    res.status(400).json({ 
      success: false,
      error: "Erro ao criar usuário",
      details: error.message
    })
  }
}

// Buscar usuário por ID
exports.getUserById = async (req, res) => {
  const { id } = req.params
  try {
    const user = await User.getById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }
    res.status(200).json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar usuário',
      details: error.message
    })
  }
}

// Buscar todas as manicures com suas médias de estrelas
exports.getManicuresComEstrelas = async (req, res) => {
  try {
    const manicures = await User.getManicuresComEstrelas()
    res.status(200).json({
      success: true,
      manicures
    })
  } catch (error) {
    console.error('Erro ao buscar manicures:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar manicures',
      details: error.message
    })
  }
}

// Buscar detalhes de uma manicure específica com feedbacks
exports.getManicureDetalhes = async (req, res) => {
  const { id } = req.params
  try {
    const manicure = await User.getManicureComDetalhes(id)
    res.status(200).json({
      success: true,
      manicure
    })
  } catch (error) {
    console.error('Erro ao buscar detalhes da manicure:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes da manicure',
      details: error.message
    })
  }
}

// Atualizar média de estrelas de uma manicure
exports.atualizarMediaEstrelas = async (req, res) => {
  const { id } = req.params
  try {
    const resultado = await User.atualizarMediaEstrelas(id)
    res.status(200).json({
      success: true,
      message: 'Média de estrelas atualizada com sucesso',
      data: resultado
    })
  } catch (error) {
    console.error('Erro ao atualizar média de estrelas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar média de estrelas',
      details: error.message
    })
  }
}