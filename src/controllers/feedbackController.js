const supabase = require('../config/db');
require('dotenv').config();

exports.criarFeedback = async (req, res) => {
  const { agendamento_id, estrelas, comentario } = req.body;
  const cliente_id = req.user.id;

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
        error: 'Agendamento não encontrado ou não está concluído'
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
      .select('*');

    if (feedbackInsertError) throw feedbackInsertError;

    // Atualiza o agendamento como avaliado
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ avaliado: true })
      .eq('id', agendamento_id);

    if (updateError) throw updateError;

    res.status(201).json({
      success: true,
      feedback: feedback[0]
    });

  } catch (error) {
    console.error('Erro ao criar feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar feedback',
      details: error.message
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
        agendamento:agendamento_id(servico)
      `)
      .eq('manicure_id', manicureId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      feedbacks
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
        cliente:cliente_id(id, nome, foto),
        manicure:manicure_id(id, nome, foto),
        feedback:feedbacks(
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