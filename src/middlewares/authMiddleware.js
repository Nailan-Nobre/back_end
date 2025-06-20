const jwt = require('jsonwebtoken')
const supabase = require('../config/db')

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1] // Remove "Bearer "

  try {
    // Verifica o token JWT
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
    
    // Obtém dados atualizados do usuário
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) throw error

    // Adiciona usuário ao request
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ 
      error: 'Token inválido',
      details: error.message
    })
  }
}