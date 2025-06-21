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
    // Busca agendamentos onde o usuário é cliente OU manicure
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