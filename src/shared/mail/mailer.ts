import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarMailRecuperacion(destinatario: string, link: string) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: destinatario,
    subject: 'Recuperación de contraseña - Gestor de Torneos',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${link}">Hacé clic aquí para elegir una nueva contraseña</a></p>
      <p>Este enlace vence en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    `,
  });
}
