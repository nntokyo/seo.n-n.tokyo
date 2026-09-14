import nodemailer from 'nodemailer';
import fs from 'node:fs';

function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    const sendmailPath = process.env.SENDMAIL_PATH || '/usr/sbin/sendmail';
    if (fs.existsSync(sendmailPath)) {
      return nodemailer.createTransport({ sendmail: true, newline: 'unix', path: sendmailPath });
    }
    throw new Error('SMTPまたはsendmailが設定されていません');
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'SEO Analyzer <no-reply@seo.n-n.tokyo>';
  await transport().sendMail({
    from,
    to: email,
    subject: 'SEO Analyzer メールアドレス確認コード',
    text: `SEO Analyzer の確認コードは ${code} です。\n\nこのコードの有効期限は24時間です。心当たりがない場合は、このメールを破棄してください。`,
    html: `<p>SEO Analyzer の確認コードです。</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>有効期限は24時間です。心当たりがない場合は、このメールを破棄してください。</p>`,
  });
}

export async function sendTeamInvitationEmail(email: string, inviterName: string): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'SEO Analyzer <no-reply@seo.n-n.tokyo>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seo.n-n.tokyo';
  await transport().sendMail({
    from,
    to: email,
    subject: 'SEO Analyzer チームへの招待',
    text: `${inviterName} さんからSEO Analyzerのチームへ招待されました。\n${appUrl}/login からログインまたは登録してください。`,
    html: `<p>${inviterName} さんからSEO Analyzerのチームへ招待されました。</p><p><a href="${appUrl}/login">SEO Analyzerを開く</a></p>`,
  });
}

export async function sendAlertEmail(email: string, projectName: string, score: number, url: string): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'SEO Analyzer <no-reply@seo.n-n.tokyo>';
  await transport().sendMail({
    from,
    to: email,
    subject: `SEO Analyzer アラート: ${projectName}`,
    text: `${projectName} のSEO診断スコアが ${score} 点になりました。\n対象URL: ${url}`,
    html: `<p><strong>${projectName}</strong> のSEO診断スコアが <strong>${score}</strong> 点になりました。</p><p>${url}</p>`,
  });
}
