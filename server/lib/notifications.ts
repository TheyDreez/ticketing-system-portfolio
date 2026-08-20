import { logger } from '../lib/logger';
import nodemailer from 'nodemailer';

export async function sendSlaBreachAlert(ticket: any) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  const to = process.env.SLA_ALERT_RECIPIENTS;

  if (!host || !user || !pass || !from || !to) {
    logger.warn('SMTP não configurado, alerta de SLA não enviado');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to,
      subject: `ALERTA DE SLA ESTOURADO: Chamado ${ticket.id}`,
      text: `O chamado ${ticket.id} ("${ticket.title}") violou o tempo limite do SLA.\n\nDetalhes:\nPrioridade: ${ticket.priority}\nCategoria: ${ticket.category}\nStatus: ${ticket.status}\nCriado em: ${ticket.createdAt}\n\nPor favor, verifique no painel AcmeCorp Ops Center o mais rápido possível.`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`[SLA Alert] E-mail de violação enviado com sucesso para ${ticket.id}`);
  } catch (error) {
    logger.error({ err: error }, `[SLA Alert Error] Falha ao enviar e-mail para ${ticket.id}:`);
  }
}
