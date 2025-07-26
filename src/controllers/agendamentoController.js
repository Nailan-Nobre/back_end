const supabase = require('../config/db');

// Criar novo agendamento
exports.criarAgendamento = async (req, res) => {
  const { manicureId, dataHora, servico, observacoes } = req.body;
  const clienteId = req.user.id; // Obtido do middleware de autenticação

  try {
    // Verifica se a manicure existe
    const { data: manicure, error: manicureError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', manicureId)
      .eq('tipo', 'MANICURE')
      .single();

    if (manicureError || !manicure) {
      return res.status(404).json({
        success: false,
        error: 'Manicure não encontrada'
      });
    }

    // Verifica conflitos de horário
    const { data: conflito, error: conflitoError } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('manicure_id', manicureId)
      .eq('data_hora', new Date(dataHora).toISOString())
      .not('status', 'eq', 'cancelado')
      .single();

    if (!conflitoError && conflito) {
      return res.status(409).json({
        success: false,
        error: 'Horário já agendado para esta manicure'
      });
    }

    // Cria o agendamento
    const { data: novoAgendamento, error } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: clienteId,
        manicure_id: manicureId,
        data_hora: new Date(dataHora).toISOString(),
        servico,
        observacoes
      })
      .select(`
         id,
         data_hora,
         servico,
         observacoes,
         status,
         cliente:cliente_id (id, nome, foto),
         manicure:manicure_id (id, nome, foto)
      `);

    if (error) throw error;

    res.status(201).json({
      success: true,
      agendamento: novoAgendamento[0]
    });

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar agendamento',
      details: error.message
    });
  }
};

// Listar agendamentos do usuário logado
exports.listarAgendamentosUsuario = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        servico,
        status,
        observacoes,
        cliente:cliente_id (id, nome, foto),
        manicure:manicure_id (id, nome, foto)
      `)
      .or(`cliente_id.eq.${userId},manicure_id.eq.${userId}`)
      .order('data_hora', { ascending: true });

    if (error) throw error;

    // Separa agendamentos como cliente e como manicure
    const comoCliente = agendamentos.filter(a => a.cliente.id === userId);
    const comoManicure = agendamentos.filter(a => a.manicure.id === userId);

    res.json({
      success: true,
      agendamentos: {
        comoCliente,
        comoManicure
      }
    });

  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar agendamentos',
      details: error.message
    });
  }
};

// Listar solicitações de manicure pendentes (CORRIGIDO)
exports.listarSolicitacoesManicure = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        servico,
        status,
        observacoes,
        cliente:cliente_id (id, nome, foto),
        manicure:manicure_id (id, nome, foto)
      `)
      .eq('manicure_id', userId)
      .eq('status', 'pendente')
      .order('data_hora', { ascending: true });

    if (error) throw error;

    // Garante que o objeto cliente está preenchido corretamente
    const agendamentosFormatados = agendamentos.map(agendamento => ({
      ...agendamento,
      cliente: agendamento.cliente || { id: null, nome: 'Cliente', foto: 'imagens/user.png' }
    }));

    res.json({
      success: true,
      agendamentos: agendamentosFormatados
    });

  } catch (error) {
    console.error('Erro ao listar solicitações pendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar solicitações pendentes',
      details: error.message
    });
  }
};

// Listar agendamentos confirmados (CORRIGIDO)
exports.listarAgendamentosConfirmados = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        servico,
        status,
        observacoes,
        cliente:cliente_id (id, nome, foto),
        manicure:manicure_id (id, nome, foto)
      `)
      .eq('manicure_id', userId)  // Alterado para pegar apenas os da manicure logada
      .eq('status', 'confirmado')
      .order('data_hora', { ascending: true });

    if (error) throw error;

    // Garante que o objeto cliente está preenchido corretamente
    const agendamentosFormatados = agendamentos.map(agendamento => ({
      ...agendamento,
      cliente: agendamento.cliente || { id: null, nome: 'Cliente', foto: 'imagens/user.png' }
    }));

    res.json({
      success: true,
      agendamentos: agendamentosFormatados
    });

  } catch (error) {
    console.error('Erro ao listar agendamentos confirmados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar agendamentos confirmados',
      details: error.message
    });
  }
};

// Listar histórico de agendamentos (CORRIGIDO)
exports.listarAgendamentosHistorico = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        servico,
        status,
        observacoes,
        cliente:cliente_id (id, nome, foto),
        manicure:manicure_id (id, nome, foto)
      `)
      .eq('manicure_id', userId)  // Alterado para pegar apenas os da manicure logada
      .in('status', ['concluido', 'cancelado', 'recusado'])
      .order('data_hora', { ascending: false });

    if (error) throw error;

    // Garante que o objeto cliente está preenchido corretamente
    const agendamentosFormatados = agendamentos.map(agendamento => ({
      ...agendamento,
      cliente: agendamento.cliente || { id: null, nome: 'Cliente', foto: 'imagens/user.png' }
    }));

    res.json({
      success: true,
      agendamentos: agendamentosFormatados
    });

  } catch (error) {
    console.error('Erro ao listar histórico de agendamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar histórico de agendamentos',
      details: error.message
    });
  }
};


// Atualizar status do agendamento (CORRIGIDO)
exports.atualizarStatusAgendamento = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const manicureId = req.user.id;

  try {
    // Verifica se o agendamento pertence à manicure
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('manicure_id')
      .eq('id', id)
      .single();

    if (agendamentoError || !agendamento) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      });
    }

    if (agendamento.manicure_id !== manicureId) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para alterar este agendamento'
      });
    }

    // Atualiza o status
    const { data: updated, error: updateError } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id)
      .select(`
        id,
        data_hora,
        servico,
        status,
        observacoes,
        cliente:cliente_id (id, nome, foto)
      `);

    if (updateError) throw updateError;

    res.json({
      success: true,
      agendamento: updated[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar agendamento',
      details: error.message
    });
  }
};