<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0; padding:0; background:#f4f2fb; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:#6d28d9; padding:28px; text-align:center;">
              <span style="color:#ffffff; font-size:22px; font-weight:800;">{{ $storeName }}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 12px; font-size:20px; color:#1a1a1a;">¿Olvidaste tu contraseña?</h1>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.5; color:#444;">
                Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón de abajo para elegir una nueva. Este enlace vence en 30 minutos.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:8px; background:#6d28d9;">
                    <a href="{{ $resetUrl }}" style="display:inline-block; padding:14px 28px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">
                      Cambiar contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0; font-size:13px; line-height:1.5; color:#888;">
                Si no pediste este cambio, podés ignorar este correo — tu contraseña actual sigue siendo válida.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
