const supabase = require('../config/db');
require('dotenv').config();

exports.criarFeedback = async (req, res) => {
  const { agendamento_id, estrelas, comentario } = req.body;
  const cliente_id = req.user.id;

  // Validação básica
  if (!agendamento_id || !estrelas || estrelas < 1 || estrelas > 5) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos. Estrelas devem ser entre 1 e 5'
    });
  }

  try {
    // Verifica se o agendamento existe e pertence ao cliente
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('id, cliente_id, manicure_id, status')
      .eq('id', agendamento_id)
      .eq('cliente_id', cliente_id)
      .eq('status', 'concluido')
      .single();

    if (agendamentoError || !agendamento) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado, não pertence ao usuário ou não está concluído'
      });
    }

    // Verifica se já existe feedback para este agendamento
    const { data: feedbackExistente, error: feedbackError } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('agendamento_id', agendamento_id)
      .single();

    if (!feedbackError && feedbackExistente) {
      return res.status(400).json({
        success: false,
        error: 'Feedback já enviado para este agendamento'
      });
    }

    // Cria o feedback
    const { data: feedback, error: feedbackInsertError } = await supabase
      .from('feedbacks')
      .insert({
        agendamento_id,
        cliente_id,
        manicure_id: agendamento.manicure_id,
        estrelas,
        comentario
      })
      .select(`
        *,
        cliente:usuarios!cliente_id(nome, foto),
        manicure:usuarios!manicure_id(nome, foto)
      `);

    if (feedbackInsertError) {
      console.error('Erro ao inserir feedback:', feedbackInsertError);
      throw feedbackInsertError;
    }

    // Atualiza o agendamento como avaliado
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ avaliado: true })
      .eq('id', agendamento_id);

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError);
      throw updateError;
    }

    // DEBUG: Verifica se a média foi atualizada pelo trigger
    const { data: manicureAtualizada, error: errorManicure } = await supabase
      .from('usuarios')
      .select('estrelas, nome')
      .eq('id', agendamento.manicure_id)
      .single();

    console.log('Média de estrelas após feedback:', {
      manicure: manicureAtualizada?.nome,
      media: manicureAtualizada?.estrelas
    });

    res.status(201).json({
      success: true,
      message: 'Feedback criado com sucesso',
      feedback: feedback[0],
      media_atualizada: manicureAtualizada?.estrelas
    });

  } catch (error) {
    console.error('Erro ao criar feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao criar feedback',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getFeedbacksPorManicure = async (req, res) => {
  const { manicureId } = req.params;

  try {
    const { data: feedbacks, error } = await supabase
      .from('feedbacks')
      .select(`
        id,
        estrelas,
        comentario,
        created_at,
        usuario:usuarios!cliente_id(nome, foto),
        agendamento:agendamentos!agendamento_id(servico)
      `)
      .eq('manicure_id', manicureId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Busca também a média atual da manicure
    const { data: manicure, error: errorManicure } = await supabase
      .from('usuarios')
      .select('estrelas, nome')
      .eq('id', manicureId)
      .single();

    res.json({
      success: true,
      feedbacks: feedbacks || [],
      media_estrelas: manicure?.estrelas || 0,
      total_feedbacks: feedbacks?.length || 0
    });

  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar feedbacks',
      details: error.message
    });
  }
};

exports.getAgendamentoComFeedback = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        cliente:usuarios!cliente_id(id, nome, foto),
        manicure:usuarios!manicure_id(id, nome, foto, estrelas),
        feedbacks(
          id, 
          estrelas, 
          comentario,
          created_at
        )
      `)
      .or(`cliente_id.eq.${userId},manicure_id.eq.${userId}`)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!agendamento) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      });
    }

    res.json({
      success: true,
      agendamento
    });

  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agendamento',
      details: error.message
    });
  }
};

// Função para forçar atualização de média (caso necessário)
exports.atualizarMediaEstrelas = async (req, res) => {
  const { manicureId } = req.params;

  try {
    // Calcula a média manualmente
    const { data: media, error: mediaError } = await supabase
      .from('feedbacks')
      .select('estrelas')
      .eq('manicure_id', manicureId);

    if (mediaError) throw mediaError;

    const totalEstrelas = media.reduce((sum, feedback) => sum + parseInt(feedback.estrelas), 0);
    const mediaCalculada = media.length > 0 ? (totalEstrelas / media.length).toFixed(2) : 0;

    // Atualiza manualmente
    const { data: manicure, error: updateError } = await supabase
      .from('usuarios')
      .update({ 
        estrelas: mediaCalculada,
        updated_at: new Date().toISOString()
      })
      .eq('id', manicureId)
      .select('estrelas, nome');

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Média de estrelas atualizada manualmente',
      manicure: manicure[0],
      media_calculada: mediaCalculada
    });

  } catch (error) {
    console.error('Erro ao atualizar média:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar média de estrelas',
      details: error.message
    });
  }
};