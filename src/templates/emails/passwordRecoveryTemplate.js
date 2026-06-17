const getPasswordRecoveryEmail = (resetLink, durationMinutes) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Clave</title>
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f3f4f6;
          color: #1f2937;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .header {
          background-color: #4f46e5;
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 30px 40px;
        }
        .content h2 {
          color: #111827;
          font-size: 20px;
          margin-top: 0;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #4b5563;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          background-color: #4f46e5;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          display: inline-block;
          transition: background-color 0.3s ease;
        }
        .button:hover {
          background-color: #4338ca;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
        }
        .link-fallback {
          font-size: 14px;
          color: #6b7280;
          word-break: break-all;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px dashed #e5e7eb;
        }
        @media (max-width: 600px) {
          .container {
            margin: 20px;
            width: auto;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ViaLuna</h1>
        </div>
        <div class="content">
          <h2>Recuperación de clave</h2>
          <p>Hola,</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de administrador en <strong>ViaLuna</strong>.</p>
          <p>Haz clic en el siguiente botón para crear una nueva clave:</p>
          
          <div class="button-container">
            <a href="\${resetLink}" class="button">Restablecer Contraseña</a>
          </div>
          
          <p>Este enlace expirará en <strong>\${durationMinutes} minutos</strong>.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña seguirá siendo la misma.</p>
          
          <div class="link-fallback">
            <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p><a href="\${resetLink}" style="color: #4f46e5;">\${resetLink}</a></p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; \${new Date().getFullYear()} ViaLuna. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = getPasswordRecoveryEmail;
