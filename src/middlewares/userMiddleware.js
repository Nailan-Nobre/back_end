const supabase = require('../config/db')

exports.getUserProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) throw error

    req.userProfile = data
    next()
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar perfil' })
  }
}