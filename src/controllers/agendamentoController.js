const supabase = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do serviço de e-mail
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Função para enviar e-mail
async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'no-reply@prettynails.com',
            to,
            subject,
            html
        });
        console.log(`E-mail enviado para ${to}`);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
    }
}

function normalizeAgendamento(agendamento) {
    if (!agendamento) {
        return agendamento;
    }

    return {
        ...agendamento,
        cliente: agendamento.cliente || {
            id: null,
            nome: agendamento.cliente_nome || 'Cliente',
            foto: 'imagens/user.png'
        },
        manicure: agendamento.manicure || {
            id: agendamento.manicure_id || null,
            nome: 'Manicure',
            foto: 'imagens/user.png'
        }
    };
}

function normalizeAgendamentosParaLista(agendamentos = []) {
    return agendamentos.map(normalizeAgendamento);
}

function formatarDataAgendamento(dataHora) {
    return new Date(dataHora).toLocaleString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getEmailClienteAgendamentoTemplate({ clienteNome, manicureNome, servico, dataHora, observacoes, linkAgendamento }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agendamento Recebido - Pretty Nails</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 0; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px;">
        <h1 style="color: #FF6B6B;">Agendamento recebido</h1>
        <p>Olá, <strong>${clienteNome}</strong>.</p>
        <p>Seu agendamento com <strong>${manicureNome}</strong> foi registrado com sucesso.</p>
        <p><strong>Serviço:</strong> ${servico}<br>
        <strong>Data/Horário:</strong> ${formatarDataAgendamento(dataHora)}<br>
        <strong>Observações:</strong> ${observacoes || 'Nenhuma'}</p>
        <p>Você pode acessar novamente o link da manicure aqui:</p>
        <p><a href="${linkAgendamento}" style="display:inline-block;background:#FF6B6B;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">Abrir agendamento</a></p>
    </div>
</body>
</html>`;
}

function getEmailManicureAgendamentoTemplate({ clienteNome, clienteEmail, clienteCpf, clienteTelefone, manicureNome, servico, dataHora, observacoes, linkPainel }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Agendamento - Pretty Nails</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 0; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px;">
        <h1 style="color: #FF6B6B;">Novo agendamento recebido</h1>
        <p>Você recebeu um novo agendamento de <strong>${clienteNome}</strong>.</p>
        <p><strong>E-mail:</strong> ${clienteEmail}<br>
        <strong>CPF:</strong> ${clienteCpf}<br>
        <strong>Telefone:</strong> ${clienteTelefone || 'Não informado'}<br>
        <strong>Serviço:</strong> ${servico}<br>
        <strong>Data/Horário:</strong> ${formatarDataAgendamento(dataHora)}<br>
        <strong>Observações:</strong> ${observacoes || 'Nenhuma'}</p>
        <p><a href="${linkPainel}" style="display:inline-block;background:#FF6B6B;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">Abrir painel</a></p>
    </div>
</body>
</html>`;
}


// Criar novo agendamento
exports.criarAgendamento = async (req, res) => {
    const {
        slug,
        manicureId,
        dataHora,
        servico,
        observacoes,
        clienteNome,
        clienteCpf,
        clienteTelefone,
        clienteEmail
    } = req.body;

    try {
        if (!clienteNome || !clienteCpf || !clienteEmail || !dataHora || !servico) {
            return res.status(400).json({
                success: false,
                error: 'Preencha nome, e-mail, CPF, serviço e data do agendamento'
            });
        }

        const manicureQuery = supabase
            .from('manicures')
            .select('id, nome, email, foto, slug, ativa')
            .limit(1);

        const { data: manicure, error: manicureError } = slug
            ? await manicureQuery.eq('slug', slug).single()
            : await manicureQuery.eq('id', manicureId).single();

        if (manicureError || !manicure) {
            return res.status(404).json({
                success: false,
                error: 'Manicure não encontrada'
            });
        }

        if (manicure.ativa === false) {
            return res.status(403).json({
                success: false,
                error: 'Este link de agendamento está desativado'
            });
        }

        const dataAgendamento = new Date(dataHora);

        if (Number.isNaN(dataAgendamento.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Data do agendamento inválida'
            });
        }

        // Verifica conflitos de horário
        const { data: conflito, error: conflitoError } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('manicure_id', manicure.id)
            .eq('data_hora', dataAgendamento.toISOString())
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
                manicure_id: manicure.id,
                cliente_nome: clienteNome,
                cliente_email: clienteEmail,
                cliente_cpf: clienteCpf,
                cliente_telefone: clienteTelefone || null,
                data_hora: dataAgendamento.toISOString(),
                servico,
                observacoes,
                status: 'pendente'
            })
            .select(`
         id,
         data_hora,
         servico,
         observacoes,
         status,
            cliente_nome,
            cliente_email,
            cliente_cpf,
            cliente_telefone,
            manicure:manicure_id (id, nome, foto)
      `);

        if (error) throw error;

        const linkAgendamento = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/agendamento/${encodeURIComponent(manicure.slug || slug || '')}`;
        const linkPainel = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cadastro-e-login/cadastro-e-login.html`;

        const emailManicureSubject = 'Novo Agendamento - Pretty Nails';
        const emailClienteSubject = 'Seu agendamento foi recebido - Pretty Nails';
        const emailManicureHtml = getEmailManicureAgendamentoTemplate({
            clienteNome,
            clienteEmail,
            clienteCpf,
            clienteTelefone,
            manicureNome: manicure.nome,
            servico,
            dataHora: dataAgendamento,
            observacoes,
            linkPainel
        });
        const emailClienteHtml = getEmailClienteAgendamentoTemplate({
            clienteNome,
            manicureNome: manicure.nome,
            servico,
            dataHora: dataAgendamento,
            observacoes,
            linkAgendamento
        });

        await Promise.allSettled([
            sendEmail(manicure.email, emailManicureSubject, emailManicureHtml),
            sendEmail(clienteEmail, emailClienteSubject, emailClienteHtml)
        ]);

        res.status(201).json({
            success: true,
            agendamento: normalizeAgendamento(novoAgendamento[0])
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

// Obter estatísticas de agendamentos (concluídos e cancelados/recusados) dos últimos 5 meses
exports.obterEstatisticasAgendamentos = async (req, res) => {
    const manicureId = req.user.id;
    
    console.log('=== OBTENDO ESTATÍSTICAS ===');
    console.log('Manicure ID:', manicureId);
    console.log('User object:', req.user);

    try {
        // Buscar agendamentos dos últimos 5 meses
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - 4);
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);
        
        console.log('Data início:', dataInicio.toISOString());

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('id, data_hora, status')
            .eq('manicure_id', manicureId)
            .in('status', ['concluido', 'cancelado', 'recusado'])
            .gte('data_hora', dataInicio.toISOString())
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('Erro no Supabase:', error);
            throw error;
        }

        console.log('Agendamentos encontrados:', agendamentos.length);
        console.log('Agendamentos:', agendamentos);

        // Organizar dados por mês
        const estatisticasPorMes = {};
        const mesesLabels = [];

        // Inicializar os últimos 5 meses com 0
        for (let i = 4; i >= 0; i--) {
            const data = new Date();
            data.setMonth(data.getMonth() - i);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            const mesLabel = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            estatisticasPorMes[mesAno] = {
                concluidos: 0,
                cancelados: 0
            };
            mesesLabels.push(mesLabel);
        }

        console.log('Meses inicializados:', Object.keys(estatisticasPorMes));

        // Contar agendamentos por mês
        agendamentos.forEach(agendamento => {
            const data = new Date(agendamento.data_hora);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            
            console.log(`Processando agendamento: ${agendamento.id}, data: ${data.toISOString()}, mesAno: ${mesAno}, status: ${agendamento.status}`);
            
            if (estatisticasPorMes.hasOwnProperty(mesAno)) {
                if (agendamento.status === 'concluido') {
                    estatisticasPorMes[mesAno].concluidos++;
                } else if (agendamento.status === 'cancelado' || agendamento.status === 'recusado') {
                    estatisticasPorMes[mesAno].cancelados++;
                }
            }
        });

        console.log('Estatísticas finais por mês:', estatisticasPorMes);

        // Converter para arrays de valores
        const dadosConcluidos = Object.values(estatisticasPorMes).map(mes => mes.concluidos);
        const dadosCancelados = Object.values(estatisticasPorMes).map(mes => mes.cancelados);

        console.log('Dados concluídos:', dadosConcluidos);
        console.log('Dados cancelados:', dadosCancelados);

        const resultado = {
            success: true,
            estatisticas: {
                labels: mesesLabels,
                dadosConcluidos: dadosConcluidos,
                dadosCancelados: dadosCancelados,
                totalConcluidos: dadosConcluidos.reduce((sum, val) => sum + val, 0),
                totalCancelados: dadosCancelados.reduce((sum, val) => sum + val, 0)
            }
        };

        console.log('Resultado final:', resultado);
        res.json(resultado);

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas de agendamentos',
            details: error.message
        });
    }
};

// Obter histórico completo de estatísticas por ano
exports.obterHistoricoEstatisticas = async (req, res) => {
    const manicureId = req.user.id;
    const { ano } = req.query;

    console.log('=== OBTENDO HISTÓRICO ===');
    console.log('Manicure ID:', manicureId);
    console.log('Ano solicitado:', ano);

    try {
        // Se não foi especificado um ano, usar o ano atual
        const anoEscolhido = ano ? parseInt(ano) : new Date().getFullYear();
        console.log('Ano escolhido:', anoEscolhido);

        // Data de início e fim do ano
        const dataInicio = new Date(anoEscolhido, 0, 1); // 1º de janeiro
        const dataFim = new Date(anoEscolhido, 11, 31, 23, 59, 59); // 31 de dezembro

        console.log('Data início:', dataInicio.toISOString());
        console.log('Data fim:', dataFim.toISOString());

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('id, data_hora, status')
            .eq('manicure_id', manicureId)
            .in('status', ['concluido', 'cancelado', 'recusado'])
            .gte('data_hora', dataInicio.toISOString())
            .lte('data_hora', dataFim.toISOString())
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('Erro no Supabase (histórico):', error);
            throw error;
        }

        console.log('Agendamentos encontrados (histórico):', agendamentos.length);
        console.log('Agendamentos (histórico):', agendamentos);

        // Organizar dados por mês (Janeiro a Dezembro)
        const estatisticasPorMes = {};
        const mesesLabels = [];

        // Inicializar todos os 12 meses do ano com 0
        for (let i = 0; i < 12; i++) {
            const data = new Date(anoEscolhido, i, 1);
            const mesAno = `${anoEscolhido}-${String(i + 1).padStart(2, '0')}`;
            const mesLabel = data.toLocaleDateString('pt-BR', { month: 'long' });
            
            estatisticasPorMes[mesAno] = {
                concluidos: 0,
                cancelados: 0
            };
            mesesLabels.push(mesLabel);
        }

        // Contar agendamentos por mês
        agendamentos.forEach(agendamento => {
            const data = new Date(agendamento.data_hora);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            
            if (estatisticasPorMes.hasOwnProperty(mesAno)) {
                if (agendamento.status === 'concluido') {
                    estatisticasPorMes[mesAno].concluidos++;
                } else if (agendamento.status === 'cancelado' || agendamento.status === 'recusado') {
                    estatisticasPorMes[mesAno].cancelados++;
                }
            }
        });

        // Converter para arrays de valores
        const dadosConcluidos = Object.values(estatisticasPorMes).map(mes => mes.concluidos);
        const dadosCancelados = Object.values(estatisticasPorMes).map(mes => mes.cancelados);

        // Obter anos disponíveis (anos que têm agendamentos)
        const { data: anosDisponiveis, error: anosError } = await supabase
            .from('agendamentos')
            .select('data_hora')
            .eq('manicure_id', manicureId)
            .in('status', ['concluido', 'cancelado', 'recusado']);

        if (anosError) {
            console.error('Erro ao buscar anos disponíveis:', anosError);
            throw anosError;
        }

        const anos = [...new Set(anosDisponiveis.map(a => new Date(a.data_hora).getFullYear()))].sort();
        console.log('Anos disponíveis:', anos);

        const resultado = {
            success: true,
            historico: {
                ano: anoEscolhido,
                labels: mesesLabels,
                dadosConcluidos: dadosConcluidos,
                dadosCancelados: dadosCancelados,
                totalConcluidos: dadosConcluidos.reduce((sum, val) => sum + val, 0),
                totalCancelados: dadosCancelados.reduce((sum, val) => sum + val, 0),
                anosDisponiveis: anos
            }
        };

        console.log('Resultado histórico final:', resultado);
        res.json(resultado);

    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter histórico de estatísticas',
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
        avaliado,
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone,
        manicure:manicure_id (id, nome, foto)
      `)
            .eq('manicure_id', userId)
            .order('data_hora', { ascending: true });

        if (error) throw error;

        const agendamentosComFeedback = normalizeAgendamentosParaLista(agendamentos);

        res.json({
            success: true,
            agendamentos: {
                comoCliente: [],
                comoManicure: agendamentosComFeedback
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
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone,
        manicure:manicure_id (id, nome, foto)
      `)
            .eq('manicure_id', userId)
            .eq('status', 'pendente')
            .order('data_hora', { ascending: true });

        if (error) throw error;

        const agendamentosFormatados = normalizeAgendamentosParaLista(agendamentos);

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
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone,
        manicure:manicure_id (id, nome, foto)
      `)
            .eq('manicure_id', userId)  // Alterado para pegar apenas os da manicure logada
            .eq('status', 'confirmado')
            .order('data_hora', { ascending: true });

        if (error) throw error;

        const agendamentosFormatados = normalizeAgendamentosParaLista(agendamentos);

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
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone,
        manicure:manicure_id (id, nome, foto)
      `)
            .eq('manicure_id', userId)  // Alterado para pegar apenas os da manicure logada
            .in('status', ['concluido', 'cancelado', 'recusado'])
            .order('data_hora', { ascending: false });

        if (error) throw error;

        const agendamentosFormatados = normalizeAgendamentosParaLista(agendamentos);

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
            .select(`
                manicure_id,
                data_hora,
                servico,
                observacoes,
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone,
                manicure:manicure_id(nome)
            `)
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
                cliente_nome,
                cliente_email,
                cliente_cpf,
                cliente_telefone
            `);

        if (updateError) throw updateError;

        if (agendamento.cliente_email && ['confirmado', 'cancelado', 'concluido', 'recusado'].includes(status)) {
            const statusSubjectMap = {
                confirmado: 'Agendamento confirmado - Pretty Nails',
                cancelado: 'Agendamento cancelado - Pretty Nails',
                concluido: 'Atendimento concluído - Pretty Nails',
                recusado: 'Agendamento recusado - Pretty Nails'
            };

            const emailStatusHtml = getStatusEmailTemplate(
                agendamento.cliente_nome,
                agendamento.manicure?.nome || 'sua manicure',
                agendamento.servico,
                agendamento.data_hora,
                status,
                agendamento.observacoes
            );

            await sendEmail(
                agendamento.cliente_email,
                statusSubjectMap[status] || 'Atualização de agendamento - Pretty Nails',
                emailStatusHtml
            );
        }

        res.json({
            success: true,
            agendamento: normalizeAgendamento(updated[0])
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

// Função auxiliar para gerar o template de e-mail de status
function getStatusEmailTemplate(clienteNome, manicureNome, servico, dataHora, status, observacoes) {
    const statusMessages = {
        'confirmado': {
            title: 'Agendamento Confirmado',
            message: `Seu agendamento com ${manicureNome} foi confirmado.`,
            buttonText: 'Ver Detalhes',
            buttonUrl: 'https://pretty-nails-app.vercel.app/cadastro-e-login/cadastro-e-login.html'
        },
        'cancelado': {
            title: 'Agendamento Cancelado',
            message: `Seu agendamento com ${manicureNome} foi cancelado.`,
            buttonText: 'Agendar Novamente',
            buttonUrl: 'https://pretty-nails-app.vercel.app/cadastro-e-login/cadastro-e-login.html'
        },
        'concluido': {
            title: 'Atendimento Concluído',
            message: `Seu atendimento com ${manicureNome} foi concluído com sucesso!`,
            buttonText: 'Avaliar Atendimento',
            buttonUrl: 'https://pretty-nails-app.vercel.app/cadastro-e-login/cadastro-e-login.html'
        },
        'recusado': {
            title: 'Agendamento Recusado',
            message: `Seu agendamento com ${manicureNome} foi recusado.`,
            buttonText: 'Agendar Novamente',
            buttonUrl: 'https://pretty-nails-app.vercel.app/cadastro-e-login/cadastro-e-login.html'
        },
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusMessages[status].title} - Pretty Nails</title>
    <style type="text/css">
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eeeeee;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .content {
            padding: 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #eeeeee;
            font-size: 12px;
            color: #777777;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #FF6B6B;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 15px 0;
        }
        .appointment-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .detail-item {
            margin-bottom: 8px;
        }
        .detail-label {
            font-weight: bold;
            color: #555555;
            display: inline-block;
            width: 100px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #FF6B6B; margin-top: 15px;">${statusMessages[status].title}</h1>
        </div>
        
        <div class="content">
            <p>Olá ${clienteNome},</p>
            <p>${statusMessages[status].message}</p>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <span class="detail-label">Profissional:</span>
                    <span>${manicureNome}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Serviço:</span>
                    <span>${servico}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Data/Horário:</span>
                    <span>${new Date(dataHora).toLocaleString('pt-BR', { 
                        weekday: 'long', 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                ${observacoes ? `
                <div class="detail-item">
                    <span class="detail-label">Observações:</span>
                    <span>${observacoes}</span>
                </div>
                ` : ''}
            </div>
            
            ${status === 'concluido' ? 
            `<p>Avalie sua experiência para nos ajudar a melhorar ainda mais:</p>` 
            : ''}
            
            <a href="${statusMessages[status].buttonUrl}" class="button">
                ${statusMessages[status].buttonText}
            </a>
            
            <p style="margin-top: 20px;">Atenciosamente,<br>Equipe Pretty Nails</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Pretty Nails. Todos os direitos reservados.</p>
            <p>Este é um e-mail automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
    `;
}

