const nodemailer = require('nodemailer');
const config = require('../config');

// Create transporter
const createTransporter = () => {
  // If no SMTP credentials configured, use console logging (dev mode)
  if (!config.email.user || !config.email.pass) {
    console.log('⚠️ Email service: No SMTP credentials configured. Emails will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

let transporter = null;

// Initialize transporter lazily
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send 2FA verification code via email
 */
const send2FACode = async (to, code, userName) => {
  const emailTransporter = getTransporter();
  
  const mailOptions = {
    from: `"${config.twoFactor.appName}" <${config.email.from}>`,
    to,
    subject: `รหัสยืนยันตัวตน - ${config.twoFactor.appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รหัสยืนยันตัวตน</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2b7fff 0%, #1e5fd9 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                      🔐 รหัสยืนยันตัวตน
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                      สวัสดีคุณ <strong>${userName || 'ผู้ใช้'}</strong>,
                    </p>
                    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                      นี่คือรหัสยืนยันตัวตนสำหรับการเข้าสู่ระบบ ${config.twoFactor.appName}
                    </p>
                    
                    <!-- Code Box -->
                    <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%); border: 2px dashed #2b7fff; border-radius: 12px; padding: 28px; text-align: center; margin: 0 0 32px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">
                        รหัสยืนยันของคุณ
                      </p>
                      <h2 style="color: #2b7fff; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${code}
                      </h2>
                    </div>
                    
                    <!-- Warning -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px;">
                      <p style="color: #92400e; font-size: 14px; margin: 0;">
                        ⚠️ <strong>สำคัญ:</strong> รหัสนี้จะหมดอายุภายใน <strong>5 นาที</strong> และใช้ได้เพียงครั้งเดียว
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                      หากคุณไม่ได้ร้องขอรหัสนี้ กรุณาเพิกเฉยอีเมลนี้ หรือติดต่อผู้ดูแลระบบทันที
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                      © ${new Date().getFullYear()} ${config.twoFactor.appName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `รหัสยืนยันตัวตนของคุณคือ: ${code}\n\nรหัสนี้จะหมดอายุภายใน 5 นาทีและใช้ได้เพียงครั้งเดียว\n\nหากคุณไม่ได้ร้องขอรหัสนี้ กรุณาเพิกเฉยอีเมลนี้`,
  };

  // If no transporter (dev mode), log to console
  if (!emailTransporter) {
    console.log('📧 [DEV] Email would be sent to:', to);
    console.log('📧 [DEV] 2FA Code:', code);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('📧 2FA email sent to:', to, 'MessageID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('📧 Failed to send 2FA email:', error);
    throw error;
  }
};

/**
 * Send 2FA setup confirmation email
 */
const send2FASetupEmail = async (to, method, userName) => {
  const emailTransporter = getTransporter();
  
  const methodText = method === 'totp' ? 'แอป Authenticator' : 'อีเมล';
  
  const mailOptions = {
    from: `"${config.twoFactor.appName}" <${config.email.from}>`,
    to,
    subject: `เปิดใช้งานการยืนยันตัวตนสองขั้นตอนสำเร็จ - ${config.twoFactor.appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                      ✅ เปิดใช้งาน 2FA สำเร็จ
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                      สวัสดีคุณ <strong>${userName || 'ผู้ใช้'}</strong>,
                    </p>
                    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      การยืนยันตัวตนสองขั้นตอน (2FA) ของบัญชีคุณได้ถูกเปิดใช้งานแล้วโดยใช้ <strong>${methodText}</strong>
                    </p>
                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0;">
                      <p style="color: #065f46; font-size: 14px; margin: 0;">
                        🛡️ บัญชีของคุณมีความปลอดภัยมากขึ้นแล้ว
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                      © ${new Date().getFullYear()} ${config.twoFactor.appName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `การยืนยันตัวตนสองขั้นตอน (2FA) ได้ถูกเปิดใช้งานแล้วโดยใช้ ${methodText}`,
  };

  if (!emailTransporter) {
    console.log('📧 [DEV] 2FA setup confirmation email would be sent to:', to);
    return { success: true };
  }

  try {
    await emailTransporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('📧 Failed to send 2FA setup email:', error);
    // Don't throw - this is not critical
    return { success: false, error };
  }
};

module.exports = {
  send2FACode,
  send2FASetupEmail,
};
