import nodemailer from 'nodemailer';

const transporter =
  nodemailer.createTransport({
    host:
      process.env.SMTP_HOST,

    port:
      Number(
        process.env.SMTP_PORT || 587
      ),

    secure:
      String(
        process.env.SMTP_SECURE || 'false'
      ) === 'true',

    auth: {
      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS,
    },
  });

export async function sendPasswordResetCode({
  to,
  code,
}) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    throw new Error(
      'La configuración SMTP está incompleta.'
    );
  }

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      process.env.SMTP_USER,

    to,

    subject:
      'Código de recuperación - IPS Salud Vital',

    text:
      `Tu código de recuperación de IPS Salud Vital es: ${code}. El código es válido durante 10 minutos.`,

    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>IPS Salud Vital</h2>

        <p>
          Hemos recibido una solicitud para
          restablecer tu contraseña.
        </p>

        <p>
          Tu código de recuperación es:
        </p>

        <div style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          margin:20px 0;
        ">
          ${code}
        </div>

        <p>
          Este código es válido durante 10 minutos.
        </p>

        <p>
          Si tú no solicitaste este cambio,
          puedes ignorar este mensaje.
        </p>
      </div>
    `,
  });
}