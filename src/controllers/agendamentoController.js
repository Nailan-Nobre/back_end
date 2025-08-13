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


// Criar novo agendamento
exports.criarAgendamento = async (req, res) => {
    const { manicureId, dataHora, servico, observacoes } = req.body;
    const clienteId = req.user.id;

    try {
        // Verifica se a manicure existe e obtém o e-mail
        const { data: manicure, error: manicureError } = await supabase
            .from('usuarios')
            .select('id, nome, email')
            .eq('id', manicureId)
            .eq('tipo', 'MANICURE')
            .single();

        if (manicureError || !manicure) {
            return res.status(404).json({
                success: false,
                error: 'Manicure não encontrada'
            });
        }

        // Obtém dados do cliente
        const { data: cliente, error: clienteError } = await supabase
            .from('usuarios')
            .select('id, nome, email')
            .eq('id', clienteId)
            .single();

        if (clienteError || !cliente) {
            return res.status(404).json({
                success: false,
                error: 'Cliente não encontrado'
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
                observacoes,
                status: 'pendente'
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

        // Envia e-mail para a manicure (não bloqueante)
        const emailSubject = 'Novo Agendamento - Pretty Nails';
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Agendamento - Pretty Nails</title>
    <style type="text/css">
        /* Base styles */
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
            <h1 style="color: #FF6B6B; margin-top: 15px;">Novo Agendamento Recebido</h1>
        </div>
        
        <div class="content">
            <p>Olá,</p>
            <p>Você recebeu um novo agendamento de <strong>${cliente.nome}</strong>.</p>
            
            <div class="appointment-details">
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
                <div class="detail-item">
                    <span class="detail-label">Observações:</span>
                    <span>${observacoes || 'Nenhuma observação foi fornecida'}</span>
                </div>
            </div>
            
            <p>Por favor, acesse seu painel para confirmar ou recusar este agendamento:</p>
            <a href="https://pretty-nails-app.vercel.app/cadastro-e-login/cadastro-e-login.html" class="button">Acessar Painel</a>
            
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

        sendEmail(manicure.email, emailSubject, emailHtml);

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

// Obter estatísticas de agendamentos concluídos por mês para manicure
exports.obterEstatisticasAgendamentos = async (req, res) => {
    const manicureId = req.user.id;

    try {
        // Buscar agendamentos concluídos dos últimos 12 meses
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - 11);
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('id, data_hora, status')
            .eq('manicure_id', manicureId)
            .eq('status', 'concluido')
            .gte('data_hora', dataInicio.toISOString())
            .order('data_hora', { ascending: true });

        if (error) throw error;

        // Organizar dados por mês
        const estatisticasPorMes = {};
        const mesesLabels = [];
        const dataAtual = new Date();

        // Inicializar os últimos 12 meses com 0
        for (let i = 11; i >= 0; i--) {
            const data = new Date();
            data.setMonth(data.getMonth() - i);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            const mesLabel = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            estatisticasPorMes[mesAno] = 0;
            mesesLabels.push(mesLabel);
        }

        // Contar agendamentos por mês
        agendamentos.forEach(agendamento => {
            const data = new Date(agendamento.data_hora);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            
            if (estatisticasPorMes.hasOwnProperty(mesAno)) {
                estatisticasPorMes[mesAno]++;
            }
        });

        // Converter para array de valores
        const valoresPorMes = Object.values(estatisticasPorMes);

        res.json({
            success: true,
            estatisticas: {
                labels: mesesLabels,
                dados: valoresPorMes,
                totalAgendamentos: agendamentos.length
            }
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas de agendamentos',
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
        // Verifica se o agendamento pertence à manicure e obtém dados do cliente
        const { data: agendamento, error: agendamentoError } = await supabase
            .from('agendamentos')
            .select(`
                manicure_id,
                data_hora,
                servico,
                observacoes,
                cliente:cliente_id(id, nome, email),
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
                cliente:cliente_id (id, nome, foto)
            `);

        if (updateError) throw updateError;

        // Envia e-mail para o cliente quando o status é alterado
        if (['confirmado', 'cancelado', 'concluido', 'recusado'].includes(status)) {
            const statusEmailHtml = getStatusEmailTemplate(
                agendamento.cliente.nome,
                agendamento.manicure.nome,
                agendamento.servico,
                agendamento.data_hora,
                status,
                agendamento.observacoes
            );
            
            const emailSubject = `Agendamento ${status === 'concluido' ? 'Concluído' : status.charAt(0).toUpperCase() + status.slice(1)} - Pretty Nails`;
            
            sendEmail(agendamento.cliente.email, emailSubject, statusEmailHtml);
        }

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

