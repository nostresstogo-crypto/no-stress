import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = "nostresstogo@gmail.com";
const ADMIN_EMAIL = "nostresstogo@gmail.com";

function createTransporter() {
  if (!SMTP_PASS || !SMTP_USER) {
    console.warn("[EMAIL] SMTP not configured (SMTP_USER or SMTP_PASS missing)");
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendMail(options: { to: string; subject: string; html: string }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[EMAIL] SMTP_PASS not configured, skipping email to:", options.to);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"NoStress Togo" <${FROM_EMAIL}>`,
      ...options,
    });
    console.info("[EMAIL] Sent to:", options.to, "—", options.subject);
  } catch (err) {
    console.error("[EMAIL] Failed to send to:", options.to, err);
  }
}

const baseStyle = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background-color: #0d0f1a;
  color: #e8e8f0;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
`;

const headerHtml = (title: string) => {
  const safeTitle = escapeHtml(title);
  return `
  <div style="background: linear-gradient(135deg, #7c6af7 0%, #5b4fcf 100%); padding: 32px 32px 24px; text-align: center;">
    <div style="font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">NoStress</div>
    <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px;">Découvrez les événements du Togo</div>
    <div style="height: 1px; background: rgba(255,255,255,0.2); margin: 20px 0 0;"></div>
  </div>
  <div style="padding: 32px;">
    <h2 style="margin: 0 0 16px; font-size: 22px; color: #ffffff;">${safeTitle}</h2>
`;
};

const footerHtml = `
  </div>
  <div style="background: #0a0c18; padding: 20px 32px; text-align: center; border-top: 1px solid #1e2035;">
    <p style="margin: 0; font-size: 12px; color: #6b6d8a;">
      NoStress Togo · Lomé, Togo<br>
      <a href="mailto:nostresstogo@gmail.com" style="color: #7c6af7; text-decoration: none;">nostresstogo@gmail.com</a>
    </p>
    <p style="margin: 8px 0 0; font-size: 11px; color: #4a4c6a;">
      Vous recevez cet email car vous êtes inscrit sur NoStress.
    </p>
  </div>
`;

export async function sendWelcomeEmail(to: string, name: string) {
  await sendMail({
    to,
    subject: "🎉 Bienvenue sur NoStress !",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bienvenue, ${name} ! 🎉`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre compte NoStress a été créé avec succès. Vous êtes maintenant prêt(e) à découvrir les meilleurs événements du Togo !
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c6af7;">
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            ✨ <strong style="color: #e8e8f0;">Explorez</strong> des concerts, festivals et soirées<br>
            ❤️ <strong style="color: #e8e8f0;">Ajoutez</strong> vos événements favoris<br>
            🗺️ <strong style="color: #e8e8f0;">Découvrez</strong> les lieux près de vous sur la carte
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Bon divertissement ! 🎵<br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPartnerRegistrationEmailToPartner(to: string, contactName: string, businessName: string) {
  await sendMail({
    to,
    subject: "✅ Demande d'inscription partenaire reçue – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Demande reçue, ${contactName} !`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Nous avons bien reçu votre demande d'inscription en tant que partenaire pour <strong style="color: #e8e8f0;">${businessName}</strong>.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f0c040;">
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            ⏳ Votre dossier sera examiné par notre équipe sous <strong style="color: #f0c040;">48 heures ouvrables</strong>.<br><br>
            Vous recevrez un email dès que votre demande sera traitée.
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Pour toute question, contactez-nous à <a href="mailto:nostresstogo@gmail.com" style="color: #7c6af7;">nostresstogo@gmail.com</a>.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPartnerRegistrationEmailToAdmin(partnerEmail: string, contactName: string, businessName: string, businessType: string, city: string, phone: string) {
  await sendMail({
    to: ADMIN_EMAIL,
    subject: `🆕 Nouvelle demande partenaire : ${businessName}`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml("Nouvelle demande partenaire")}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Une nouvelle structure a soumis une demande d'inscription partenaire.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px; width: 40%;">Structure</td><td style="padding: 6px 0; color: #e8e8f0; font-weight: 600;">${businessName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Contact</td><td style="padding: 6px 0; color: #e8e8f0;">${contactName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Email</td><td style="padding: 6px 0;"><a href="mailto:${partnerEmail}" style="color: #7c6af7;">${partnerEmail}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Téléphone</td><td style="padding: 6px 0; color: #e8e8f0;">${phone}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Type</td><td style="padding: 6px 0; color: #e8e8f0;">${businessType}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Ville</td><td style="padding: 6px 0; color: #e8e8f0;">${city}</td></tr>
          </table>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Connectez-vous à l'interface admin pour valider ou rejeter cette demande.<br><br>
          <strong style="color: #e8e8f0;">NoStress Admin</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPartnerApprovalEmail(to: string, contactName: string, businessName: string) {
  await sendMail({
    to,
    subject: "🎊 Votre inscription partenaire est approuvée – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Félicitations, ${contactName} ! 🎊`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre demande d'inscription pour <strong style="color: #e8e8f0;">${businessName}</strong> a été <strong style="color: #4caf8a;">approuvée</strong> par notre équipe.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #4caf8a;">
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            🚀 Vous pouvez maintenant publier vos événements sur NoStress<br>
            📍 Référencer vos lieux<br>
            📊 Suivre vos publications depuis votre tableau de bord
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Bienvenue dans la famille NoStress !<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPublicationWarningEmail(to: string, partnerName: string, publicationTitle: string, reason: string) {
  const safeName = escapeHtml(partnerName);
  const safeTitle = escapeHtml(publicationTitle);
  const safeReason = escapeHtml(reason);
  await sendMail({
    to,
    subject: "⚠️ Publication supprimée – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Avertissement, ${partnerName}`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre publication <strong style="color: #e8e8f0;">"${safeTitle}"</strong> a été supprimée par l'équipe NoStress car elle ne respecte pas nos Conditions Générales d'Utilisation et/ou notre charte éthique.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f0c040;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Motif</p>
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">${safeReason}</p>
        </div>
        <div style="background: #e0525215; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #e0525233;">
          <p style="margin: 0; font-size: 13px; color: #e05252; line-height: 1.6;">
            ⚠️ <strong>Avertissement :</strong> En cas de récidive, votre compte partenaire pourra être suspendu ou supprimé définitivement.
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Si vous pensez qu'il s'agit d'une erreur, contactez-nous à 
          <a href="mailto:nostresstogo@gmail.com" style="color: #7c6af7;">nostresstogo@gmail.com</a>.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendAccountDeletedEmail(to: string, name: string, reason: string) {
  const safeReason = escapeHtml(reason);
  await sendMail({
    to,
    subject: "🚫 Votre compte a été supprimé – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${name},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre compte sur NoStress a été supprimé par notre équipe de modération pour non-respect de nos Conditions Générales d'Utilisation.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #e05252;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Motif</p>
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">${safeReason}</p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Si vous pensez qu'il s'agit d'une erreur, contactez-nous à 
          <a href="mailto:nostresstogo@gmail.com" style="color: #7c6af7;">nostresstogo@gmail.com</a>.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPartnerRejectionEmail(to: string, contactName: string, businessName: string, reason: string) {
  const safeBusiness = escapeHtml(businessName);
  const safeReason = escapeHtml(reason);
  await sendMail({
    to,
    subject: "ℹ️ Mise à jour de votre demande partenaire – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${contactName},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Après examen, votre demande d'inscription pour <strong style="color: #e8e8f0;">${safeBusiness}</strong> n'a pas pu être acceptée pour le moment.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #e05252;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Motif</p>
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">${safeReason}</p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Si vous pensez qu'il s'agit d'une erreur ou souhaitez soumettre une nouvelle demande, contactez-nous à 
          <a href="mailto:nostresstogo@gmail.com" style="color: #7c6af7;">nostresstogo@gmail.com</a>.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}
