const supabase = require('../config/db')

const User = {
  async getAll() {
    const { data, error } = await supabase.from('usuarios').select('*')
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create({ name, email }) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ name, email, estrelas: 0 }])
      .select()
    if (error) throw error
    return data[0]
  },

  // Função para calcular e atualizar a média das estrelas de uma manicure
  async atualizarMediaEstrelas(manicureId) {
    try {
      // Busca todas as avaliações da manicure
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('estrelas')
        .eq('manicure_id', manicureId)

      if (feedbackError) throw feedbackError

      let mediaEstrelas = 0
      
      if (feedbacks && feedbacks.length > 0) {
        const somaEstrelas = feedbacks.reduce((soma, feedback) => soma + feedback.estrelas, 0)
        mediaEstrelas = parseFloat((somaEstrelas / feedbacks.length).toFixed(2))
      }

      // Atualiza a média de estrelas do usuário manicure
      const { data, error: updateError } = await supabase
        .from('usuarios')
        .update({ estrelas: mediaEstrelas })
        .eq('id', manicureId)
        .select()

      if (updateError) throw updateError

      return {
        manicureId,
        mediaEstrelas,
        totalFeedbacks: feedbacks.length
      }
    } catch (error) {
      console.error('Erro ao atualizar média de estrelas:', error)
      throw error
    }
  },

  // Função para buscar manicures com suas médias de estrelas (apenas 3+ estrelas)
  async getManicuresComEstrelas() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, telefone, cidade, estado, foto, estrelas, created_at')
      .eq('tipo', 'MANICURE')
      .gte('estrelas', 3.0) // Filtrar apenas manicures com 3 ou mais estrelas
      .order('estrelas', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Função para buscar TODAS as manicures (para telas administrativas ou pesquisa)
  async getTodasManicures() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, telefone, cidade, estado, foto, estrelas, created_at')
      .eq('tipo', 'MANICURE')
      .order('estrelas', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Função para buscar uma manicure específica com detalhes dos feedbacks
  async getManicureComDetalhes(manicureId) {
    try {
      // Busca dados da manicure
      const { data: manicure, error: manicureError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', manicureId)
        .eq('tipo', 'MANICURE')
        .single()

      if (manicureError) throw manicureError

      // Busca feedbacks da manicure
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('feedbacks')
        .select(`
          id,
          estrelas,
          comentario,
          created_at,
          cliente:usuarios!cliente_id(nome, foto)
        `)
        .eq('manicure_id', manicureId)
        .order('created_at', { ascending: false })

      if (feedbackError) throw feedbackError

      return {
        ...manicure,
        feedbacks: feedbacks || [],
        totalFeedbacks: feedbacks ? feedbacks.length : 0
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da manicure:', error)
      throw error
    }
  }
}

module.exports = User