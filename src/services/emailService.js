const nodemailer = require('nodemailer');
const emailConfig = require('../config/emailConfig');

const transporter = nodemailer.createTransport(emailConfig);

async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return false;
  }
}

module.exports = {
  sendConfirmationEmail: async (userEmail, userName, actionLink) => {
    const subject = 'Confirme seu cadastro - Pretty Nails';
    const html = `
      <h1>Bem-vinda ao Pretty Nails, ${userName}!</h1>
      <p>Seu cadastro foi criado com sucesso.</p>
      <p>Para ativar sua conta, clique no botão abaixo:</p>
      <p>
        <a href="${actionLink}" style="display:inline-block;padding:12px 20px;background:#ff5f8f;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
          Confirmar e-mail
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p>${actionLink}</p>
    `;

    return await sendEmail(userEmail, subject, html);
  },

  sendNewAppointmentEmail: async (manicureEmail, clientName, appointmentDate, service) => {
    const subject = 'Novo Agendamento - Pretty Nails';
    const html = `
      <h1>Novo Agendamento Recebido</h1>
      <p>Você recebeu um novo agendamento de ${clientName}.</p>
      <p><strong>Serviço:</strong> ${service}</p>
      <p><strong>Data/Horário:</strong> ${new Date(appointmentDate).toLocaleString('pt-BR')}</p>
      <p>Acesse seu painel para confirmar ou recusar o agendamento.</p>
    `;
    return await sendEmail(manicureEmail, subject, html);
  },

  sendStatusUpdateEmail: async (clientEmail, manicureName, appointmentDate, status) => {
    const statusMessages = {
      'confirmado': 'confirmado',
      'cancelado': 'cancelado',
      'concluido': 'concluído',
      'recusado': 'recusado',
    };

    const subject = `Agendamento ${statusMessages[status]} - Pretty Nails`;
    
    let html = `
      <h1>Status do Agendamento Atualizado</h1>
      <p>Seu agendamento com ${manicureName} foi ${statusMessages[status]}.</p>
      <p><strong>Data/Horário:</strong> ${new Date(appointmentDate).toLocaleString('pt-BR')}</p>
    `;

    if (status === 'concluido') {
      html += `<p>Avalie seu atendimento através do nosso site ou aplicativo.</p>`;
    }

    return await sendEmail(clientEmail, subject, html);
  }
};