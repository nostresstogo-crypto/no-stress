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
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || "nostresstogo@gmail.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nostresstogo@gmail.com";
const ADMIN_BASE_URL = (process.env.ADMIN_BASE_URL || "https://admin.no-stress.net").replace(/\/+$/, "");

function createTransporter() {
  if (!SMTP_PASS || !SMTP_USER) {
    console.warn("[EMAIL] SMTP not configured (SMTP_USER or SMTP_PASS missing)");
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
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

export async function sendMailOrThrow(options: { to: string; subject: string; html: string }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  await transporter.sendMail({
    from: `"NoStress Togo" <${FROM_EMAIL}>`,
    ...options,
  });
  console.info("[EMAIL] Sent to:", options.to, "—", options.subject);
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

export async function sendVerificationCodeEmail(to: string, name: string, code: string) {
  await sendMail({
    to,
    subject: `Votre code de vérification NoStress : ${code}`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Vérifiez votre email`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Bonjour ${name}, voici votre code de vérification NoStress. Il expire dans 15 minutes.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 28px; margin: 24px 0; border-left: 4px solid #7c6af7; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #e8e8f0; letter-spacing: 8px; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0; font-size: 13px;">
          Si vous n'avez pas créé de compte NoStress, ignorez cet email.
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

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

export async function sendPartnerRegistrationEmailToAdmin(partnerId: number, partnerEmail: string, contactName: string, businessName: string, businessType: string, city: string, phone: string) {
  const adminLink = `${ADMIN_BASE_URL}/partenaires?id=${partnerId}`;
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
        <div style="text-align: center; margin: 24px 0;">
          <a href="${adminLink}" style="display: inline-block; background: #7c6af7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Examiner cette demande
          </a>
        </div>
        <p style="color: #6b6d8a; line-height: 1.5; margin: 16px 0 0; font-size: 12px; text-align: center;">
          Lien direct : <a href="${adminLink}" style="color: #7c6af7; word-break: break-all;">${adminLink}</a>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendNewVenueAdminNotification(
  venue: { id: number; name: string; type?: string | null; city?: string | null; country?: string | null; address?: string | null },
  partner: { id: number; businessName: string; contactName: string; email: string },
) {
  const adminLink = `${ADMIN_BASE_URL}/lieux?id=${venue.id}`;
  await sendMail({
    to: ADMIN_EMAIL,
    subject: `🏠 Nouveau lieu à valider : ${venue.name}`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml("Nouveau lieu à valider")}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Un partenaire vient de soumettre un nouveau lieu pour validation.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px; width: 40%;">Lieu</td><td style="padding: 6px 0; color: #e8e8f0; font-weight: 600;">${venue.name}</td></tr>
            ${venue.type ? `<tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Type</td><td style="padding: 6px 0; color: #e8e8f0;">${venue.type}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Ville</td><td style="padding: 6px 0; color: #e8e8f0;">${venue.city || "—"}${venue.country ? `, ${venue.country}` : ""}</td></tr>
            ${venue.address ? `<tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Adresse</td><td style="padding: 6px 0; color: #e8e8f0;">${venue.address}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Partenaire</td><td style="padding: 6px 0; color: #e8e8f0;">${partner.businessName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Contact</td><td style="padding: 6px 0;"><a href="mailto:${partner.email}" style="color: #7c6af7;">${partner.contactName} (${partner.email})</a></td></tr>
          </table>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${adminLink}" style="display: inline-block; background: #7c6af7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Valider ce lieu
          </a>
        </div>
        <p style="color: #6b6d8a; line-height: 1.5; margin: 16px 0 0; font-size: 12px; text-align: center;">
          Lien direct : <a href="${adminLink}" style="color: #7c6af7; word-break: break-all;">${adminLink}</a>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPartnerApprovalEmail(to: string, contactName: string, businessName: string, password: string) {
  const safeEmail = escapeHtml(to);
  const safePassword = escapeHtml(password);
  // Use the throwing variant: this email is the SOLE delivery channel for the partner's
  // password, so SMTP failures must propagate to the admin route handler (not be swallowed).
  await sendMailOrThrow({
    to,
    subject: "🎊 Votre inscription partenaire est approuvée – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Félicitations, ${contactName} ! 🎊`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre demande d'inscription pour <strong style="color: #e8e8f0;">${businessName}</strong> a été <strong style="color: #4caf8a;">approuvée</strong> par notre équipe.
        </p>

        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c6af7;">
          <p style="margin: 0 0 12px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Vos identifiants</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #b0b2cc;">
            <strong style="color: #e8e8f0;">Email :</strong> ${safeEmail}
          </p>
          <p style="margin: 0 0 12px; font-size: 14px; color: #b0b2cc;">
            <strong style="color: #e8e8f0;">Mot de passe :</strong>
            <span style="display: inline-block; font-family: 'Courier New', monospace; font-size: 16px; background: #0f1020; color: #f0c040; padding: 6px 12px; border-radius: 6px; letter-spacing: 1px; margin-left: 6px;">${safePassword}</span>
          </p>
          <p style="margin: 0; font-size: 12px; color: #8a8caa; line-height: 1.5;">
            🔒 Conservez précieusement ce mot de passe. Vous pourrez le modifier après votre première connexion. Pour des raisons de sécurité, ne le partagez jamais.
          </p>
        </div>

        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #4caf8a;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            🚀 Vous pouvez maintenant publier vos événements sur NoStress<br>
            📍 Référencer vos lieux<br>
            📊 Suivre vos publications depuis votre tableau de bord
          </p>
          <p style="margin: 12px 0 0; font-size: 13px; color: #f0c040; line-height: 1.6;">
            ⚠️ <strong>Étape importante :</strong> connectez-vous puis activez votre géolocalisation depuis l'application pour que votre lieu apparaisse sur la carte.
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

export async function sendVenueApprovedEmail(
  to: string,
  contactName: string,
  venueName: string,
) {
  const safeName = escapeHtml(contactName || "Partenaire");
  const safeVenue = escapeHtml(venueName);
  await sendMail({
    to,
    subject: `✅ Votre lieu "${venueName}" a été approuvé – NoStress`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${safeName},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Bonne nouvelle ! Votre lieu <strong style="color: #e8e8f0;">${safeVenue}</strong> vient d'être
          <strong style="color: #4caf8a;">approuvé</strong> par notre équipe.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #4caf8a;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            🎉 Votre lieu est désormais visible publiquement sur NoStress.<br>
            📅 Vous pouvez créer des événements rattachés à ce lieu depuis votre tableau de bord.<br>
            📍 Pensez à vérifier que sa géolocalisation est bien renseignée pour qu'il apparaisse sur la carte.
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Merci pour votre confiance,<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendVenueRejectedEmail(
  to: string,
  contactName: string,
  venueName: string,
  reason: string,
) {
  const safeName = escapeHtml(contactName || "Partenaire");
  const safeVenue = escapeHtml(venueName);
  const safeReason = escapeHtml(reason);
  await sendMail({
    to,
    subject: `❌ Votre lieu "${venueName}" n'a pas été validé – NoStress`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${safeName},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Votre demande de validation pour le lieu <strong style="color: #e8e8f0;">${safeVenue}</strong>
          n'a malheureusement pas pu être acceptée en l'état.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f0c040;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Motif communiqué par notre équipe</p>
          <p style="margin: 0; font-size: 14px; color: #e8e8f0; line-height: 1.6; white-space: pre-line;">${safeReason}</p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Vous pouvez modifier les informations du lieu depuis votre tableau de bord puis le re-soumettre à validation.
          Si vous avez la moindre question, répondez simplement à cet email.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  password: string,
  isPartner: boolean,
) {
  const safeEmail = escapeHtml(to);
  const safePassword = escapeHtml(password);
  const safeName = escapeHtml(name || (isPartner ? "Partenaire" : "Utilisateur"));
  const audience = isPartner ? "partenaire" : "utilisateur";
  await sendMailOrThrow({
    to,
    subject: "🔑 Nouveau mot de passe – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${safeName},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Vous avez demandé la réinitialisation de votre mot de passe ${audience} sur NoStress.
          Voici votre nouveau mot de passe temporaire.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c6af7;">
          <p style="margin: 0 0 12px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Vos identifiants</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #b0b2cc;">
            <strong style="color: #e8e8f0;">Email :</strong> ${safeEmail}
          </p>
          <p style="margin: 0 0 12px; font-size: 14px; color: #b0b2cc;">
            <strong style="color: #e8e8f0;">Nouveau mot de passe :</strong>
            <span style="display: inline-block; font-family: 'Courier New', monospace; font-size: 18px; background: #0f1020; color: #f0c040; padding: 6px 14px; border-radius: 6px; letter-spacing: 2px; margin-left: 6px;">${safePassword}</span>
          </p>
          <p style="margin: 0; font-size: 12px; color: #8a8caa; line-height: 1.5;">
            🔒 Connectez-vous avec ce mot de passe puis modifiez-le dès que possible depuis votre profil.
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Si vous n'êtes pas à l'origine de cette demande, contactez-nous immédiatement.<br><br>
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

export async function sendContactMessageEmail(name: string, email: string, subject: string, message: string) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  await sendMailOrThrow({
    to: ADMIN_EMAIL,
    subject: `📬 Nouveau message contact : ${subject}`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml("Nouveau message via le formulaire contact")}
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px; width: 30%;">Nom</td><td style="padding: 6px 0; color: #e8e8f0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Email</td><td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #7c6af7;">${safeEmail}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Sujet</td><td style="padding: 6px 0; color: #e8e8f0;">${safeSubject}</td></tr>
          </table>
        </div>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; border-left: 4px solid #7c6af7;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b6d8a; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
          <p style="margin: 0; font-size: 14px; color: #e8e8f0; line-height: 1.6;">${safeMessage}</p>
        </div>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendContactConfirmationEmail(to: string, name: string) {
  await sendMail({
    to,
    subject: "✅ Message bien reçu – NoStress",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Merci ${name} !`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Nous avons bien reçu votre message et notre équipe vous répondra dans les plus brefs délais (généralement sous 48 heures ouvrables).
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c6af7;">
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            En attendant, n'hésitez pas à découvrir nos événements sur l'application NoStress 🎵
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          À bientôt,<br>
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
export async function sendDeletionRequestAdminNotification(
  requesterEmail: string,
  requesterName: string,
  accountType: string,
  reason: string | null,
  matchedAccount: { kind: "user" | "partner"; id: number } | null,
) {
  const safeEmail = escapeHtml(requesterEmail);
  const safeName = escapeHtml(requesterName);
  const safeReason = escapeHtml(reason || "Non précisé");
  const accountLabel = accountType === "partner" ? "Partenaire / Structure" : "Utilisateur";
  const matchHtml = matchedAccount
    ? `<p style="margin: 0; font-size: 13px; color: #4caf8a;">✓ Compte ${matchedAccount.kind === "partner" ? "partenaire" : "utilisateur"} #${matchedAccount.id} identifié.</p>`
    : `<p style="margin: 0; font-size: 13px; color: #f0c040;">⚠️ Aucun compte trouvé pour cet email. Vérifier manuellement.</p>`;
  await sendMail({
    to: ADMIN_EMAIL,
    subject: `🗑️ Nouvelle demande de suppression de compte – ${requesterName}`,
    html: `
      <div style="${baseStyle}">
        ${headerHtml("Nouvelle demande de suppression")}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Un utilisateur vient de soumettre une demande de suppression de compte depuis no-stress.net.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px; width: 40%;">Nom</td><td style="padding: 6px 0; color: #e8e8f0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Email</td><td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #7c6af7;">${safeEmail}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px;">Type</td><td style="padding: 6px 0; color: #e8e8f0;">${accountLabel}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b6d8a; font-size: 13px; vertical-align: top;">Raison</td><td style="padding: 6px 0; color: #e8e8f0;">${safeReason}</td></tr>
          </table>
        </div>
        <div style="background: #0f1020; border-radius: 12px; padding: 16px; margin: 16px 0;">
          ${matchHtml}
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Connectez-vous à <strong style="color: #e8e8f0;">l'interface admin</strong> pour traiter cette demande dans un délai maximum de 30 jours (RGPD / App Store).
        </p>
        ${footerHtml}
      </div>
    `,
  });
}

export async function sendDeletionConfirmedEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  await sendMail({
    to,
    subject: "✅ Votre compte NoStress a été supprimé",
    html: `
      <div style="${baseStyle}">
        ${headerHtml(`Bonjour ${safeName},`)}
        <p style="color: #b0b2cc; line-height: 1.7; margin: 0 0 16px;">
          Comme vous l'avez demandé, votre compte NoStress et l'ensemble des données qui y sont rattachées ont été <strong style="color: #4caf8a;">définitivement supprimés</strong>.
        </p>
        <div style="background: #1a1c2e; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #4caf8a;">
          <p style="margin: 0; font-size: 14px; color: #b0b2cc; line-height: 1.6;">
            Conformément au RGPD, vos informations personnelles, vos favoris, vos lieux et vos publications ont été retirés de nos serveurs.
          </p>
        </div>
        <p style="color: #b0b2cc; line-height: 1.7; margin: 16px 0 0;">
          Nous sommes désolés de vous voir partir. Vous restez le bienvenu si vous souhaitez nous rejoindre à nouveau plus tard.<br><br>
          <strong style="color: #e8e8f0;">L'équipe NoStress</strong>
        </p>
        ${footerHtml}
      </div>
    `,
  });
}
