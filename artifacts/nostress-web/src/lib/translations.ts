import type { Lang } from "./i18n";

const fr: Record<string, string> = {
  /* ── Navbar ── */
  "nav.home": "Accueil",
  "nav.terms": "CGU",
  "nav.privacy": "Confidentialité",
  "nav.delete": "Supprimer mon compte",
  "nav.contact": "Contact",
  "nav.download": "Télécharger l'App",

  /* ── Footer ── */
  "footer.desc":
    "L'application de découverte d'événements et de vie nocturne au Togo. Trouvez les meilleurs concerts, festivals et soirées à Lomé et au-delà.",
  "footer.links": "Liens Rapides",
  "footer.terms": "Conditions d'utilisation",
  "footer.privacy": "Politique de confidentialité",
  "footer.delete": "Suppression de compte",
  "footer.contact": "Contact",
  "footer.rights": "Tous droits réservés.",
  "footer.proudly": "Fièrement Togolais",

  /* ── Home – Hero ── */
  "home.hero.title": "Vivez l'énergie du",
  "home.hero.country": "Togo",
  "home.hero.title2": ", sans stress.",
  "home.hero.sub":
    "Découvrez les meilleurs concerts, festivals, et soirées. Le pouls de la vie nocturne togolaise dans votre poche.",
  "home.hero.appstore": "App Store",
  "home.hero.googleplay": "Google Play",

  /* ── Home – Features ── */
  "home.features.title": "Tout ce qu'il vous faut pour sortir",
  "home.features.sub":
    "NoStress simplifie votre vie sociale, de la découverte à la sortie.",
  "home.features.f1.title": "Découverte",
  "home.features.f1.desc":
    "Trouvez des événements exclusifs et des soirées secrètes.",
  "home.features.f2.title": "Recommandations IA",
  "home.features.f2.desc":
    "L'IA analyse vos goûts et votre ville pour vous suggérer les événements qui vous correspondent.",
  "home.features.f3.title": "Carte Interactive",
  "home.features.f3.desc":
    "Localisez les lieux les plus chauds autour de vous.",
  "home.features.f4.title": "Espace Partenaire",
  "home.features.f4.desc":
    "Gérez vos événements directement depuis l'application.",

  /* ── Home – App Mockup ── */
  "home.app.title": "L'expérience NoStress au bout des doigts",
  "home.app.sub":
    "Une interface fluide, pensée pour la nuit. Feuilletez les événements à venir, sauvegardez vos favoris et restez connecté à la vie nocturne togolaise.",
  "home.app.li1": "Recommandations personnalisées par l'IA",
  "home.app.li2": "Notifications en temps réel pour vos artistes préférés",
  "home.app.li3": "Carte interactive des lieux et événements",
  "home.app.li4": "Mode sombre exclusif pour le confort visuel",

  /* ── Home – Testimonials ── */
  "home.testimonials.title": "Ce qu'ils en disent",
  "home.testimonials.t1.quote":
    "Enfin une appli qui comprend comment on fait la fête à Lomé ! Je découvre des événements que je n'aurais jamais trouvés autrement.",
  "home.testimonials.t1.role": "Étudiant",
  "home.testimonials.t2.quote":
    "En tant que gérante de club, NoStress m'a permis de doubler ma visibilité le week-end. La gestion de mes événements n'a jamais été aussi simple.",
  "home.testimonials.t2.role": "Propriétaire de Club",
  "home.testimonials.t3.quote":
    "J'ai découvert des festivals incroyables à Kpalimé que je n'aurais jamais trouvés autrement. L'interface est magnifique et super fluide.",
  "home.testimonials.t3.role": "Designer",

  /* ── Home – CTA ── */
  "home.cta.title": "Prêt à sortir ?",
  "home.cta.sub":
    "Rejoignez des milliers de togolais qui utilisent NoStress pour planifier leurs week-ends.",
  "home.cta.ios": "Télécharger pour iOS",
  "home.cta.android": "Télécharger pour Android",

  /* ── Contact ── */
  "contact.title": "Contactez-nous",
  "contact.sub":
    "Une question, une suggestion, un partenariat ? Envoyez-nous un message, notre équipe vous répondra dans les plus brefs délais.",
  "contact.location": "Localisation",
  "contact.response": "Réponse",
  "contact.response.value": "Sous 48h ouvrables",
  "contact.success.title": "Message envoyé !",
  "contact.success.body":
    "Merci de nous avoir contactés. Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.",
  "contact.success.another": "Envoyer un autre message",
  "contact.name": "Nom complet",
  "contact.name.placeholder": "Votre nom",
  "contact.email": "Adresse email",
  "contact.subject": "Sujet",
  "contact.subject.placeholder": "L'objet de votre message",
  "contact.message": "Message",
  "contact.message.placeholder": "Écrivez votre message ici...",
  "contact.send": "Envoyer le message",
  "contact.sending": "Envoi en cours...",
  "contact.error.default": "Une erreur est survenue. Veuillez réessayer.",

  /* ── Contact validation ── */
  "contact.val.name.min": "Le nom doit contenir au moins 2 caractères",
  "contact.val.name.max": "Le nom est trop long",
  "contact.val.name.required": "Le nom est requis",
  "contact.val.email.invalid": "Adresse email invalide",
  "contact.val.email.required": "L'email est requis",
  "contact.val.subject.min": "Le sujet doit contenir au moins 3 caractères",
  "contact.val.subject.max": "Le sujet est trop long",
  "contact.val.subject.required": "Le sujet est requis",
  "contact.val.message.min": "Le message doit contenir au moins 10 caractères",
  "contact.val.message.max": "Le message est trop long",
  "contact.val.message.required": "Le message est requis",

  /* ── Account Deletion ── */
  "delete.title": "Demande de suppression de compte",
  "delete.sub":
    "Nous sommes désolés de vous voir partir. La suppression de votre compte entraînera la perte définitive de toutes vos données.",
  "delete.warning.title": "Attention : Action irréversible",
  "delete.warning.body":
    "La suppression de votre compte effacera toutes vos données personnelles, vos favoris et votre historique. Pour les partenaires, vos lieux et événements seront retirés de la plateforme.",
  "delete.success.title": "Demande reçue",
  "delete.success.body":
    "Votre demande de suppression de compte a été enregistrée. Elle sera traitée dans un délai maximum de 30 jours conformément au RGPD. Vous recevrez un email de confirmation lorsque la suppression sera effective.",
  "delete.success.contact": "Si vous avez des questions, contactez-nous à",
  "delete.name": "Nom complet",
  "delete.name.placeholder": "Votre nom tel qu'il apparaît sur l'application",
  "delete.email": "Adresse e-mail associée au compte",
  "delete.type": "Type de compte",
  "delete.type.placeholder": "Sélectionnez le type de compte",
  "delete.type.user": "Utilisateur (Application mobile)",
  "delete.type.partner": "Partenaire / Structure (Organisateur)",
  "delete.reason": "Raison de la suppression (Optionnel)",
  "delete.reason.placeholder": "Pourquoi souhaitez-vous nous quitter ?",
  "delete.reason.not_useful": "L'application ne m'est pas utile",
  "delete.reason.privacy": "Préoccupations liées à la vie privée",
  "delete.reason.too_many_emails": "Trop de notifications",
  "delete.reason.other": "Autre raison",
  "delete.confirm.label": "Je confirme vouloir supprimer définitivement mon compte",
  "delete.confirm.desc":
    "Je comprends que cette action est irréversible et que je perdrai l'accès à toutes mes données.",
  "delete.submit": "Soumettre la demande de suppression",
  "delete.submitting": "Envoi en cours...",
  "delete.error.confirm": "Vous devez confirmer la suppression.",
  "delete.error.server": "Erreur serveur. Réessayez plus tard.",
  "delete.error.network": "Erreur réseau. Réessayez.",

  /* ── Privacy ── */
  "privacy.title": "Politique de Confidentialité",
  "privacy.contact.intro":
    "Pour toute question relative à cette politique ou à vos données :",

  /* ── Terms ── */
  "terms.title": "Conditions Générales d'Utilisation",
  "terms.contact.title": "Contact",
};

const en: Record<string, string> = {
  /* ── Navbar ── */
  "nav.home": "Home",
  "nav.terms": "Terms",
  "nav.privacy": "Privacy",
  "nav.delete": "Delete my account",
  "nav.contact": "Contact",
  "nav.download": "Download the App",

  /* ── Footer ── */
  "footer.desc":
    "The event discovery and nightlife app for Togo. Find the best concerts, festivals and parties in Lomé and beyond.",
  "footer.links": "Quick Links",
  "footer.terms": "Terms of Use",
  "footer.privacy": "Privacy Policy",
  "footer.delete": "Account Deletion",
  "footer.contact": "Contact",
  "footer.rights": "All rights reserved.",
  "footer.proudly": "Proudly Togolese",

  /* ── Home – Hero ── */
  "home.hero.title": "Feel the energy of",
  "home.hero.country": "Togo",
  "home.hero.title2": ", stress-free.",
  "home.hero.sub":
    "Discover the best concerts, festivals, and nightlife events. The pulse of Togolese nightlife, in your pocket.",
  "home.hero.appstore": "App Store",
  "home.hero.googleplay": "Google Play",

  /* ── Home – Features ── */
  "home.features.title": "Everything you need to go out",
  "home.features.sub":
    "NoStress simplifies your social life, from discovery to the night out.",
  "home.features.f1.title": "Discovery",
  "home.features.f1.desc": "Find exclusive events and secret parties.",
  "home.features.f2.title": "AI Recommendations",
  "home.features.f2.desc":
    "AI analyses your tastes and city to suggest events that truly match you.",
  "home.features.f3.title": "Interactive Map",
  "home.features.f3.desc": "Locate the hottest venues around you.",
  "home.features.f4.title": "Partner Space",
  "home.features.f4.desc": "Manage your events directly from the app.",

  /* ── Home – App Mockup ── */
  "home.app.title": "The NoStress experience at your fingertips",
  "home.app.sub":
    "A smooth interface built for the night. Browse upcoming events, save your favorites and stay connected to Togolese nightlife.",
  "home.app.li1": "AI-powered personalised recommendations",
  "home.app.li2": "Real-time notifications for your favorite artists",
  "home.app.li3": "Interactive map of venues and events",
  "home.app.li4": "Exclusive dark mode for visual comfort",

  /* ── Home – Testimonials ── */
  "home.testimonials.title": "What they say",
  "home.testimonials.t1.quote":
    "Finally an app that gets how we party in Lomé! I discover events I would never have found otherwise.",
  "home.testimonials.t1.role": "Student",
  "home.testimonials.t2.quote":
    "As a club manager, NoStress doubled my weekend visibility. Managing my events has never been this easy.",
  "home.testimonials.t2.role": "Club Owner",
  "home.testimonials.t3.quote":
    "I discovered incredible festivals in Kpalimé that I would never have found otherwise. The interface is beautiful and super smooth.",
  "home.testimonials.t3.role": "Designer",

  /* ── Home – CTA ── */
  "home.cta.title": "Ready to go out?",
  "home.cta.sub":
    "Join thousands of Togolese who use NoStress to plan their weekends.",
  "home.cta.ios": "Download for iOS",
  "home.cta.android": "Download for Android",

  /* ── Contact ── */
  "contact.title": "Contact Us",
  "contact.sub":
    "A question, a suggestion, a partnership? Send us a message and our team will get back to you as soon as possible.",
  "contact.location": "Location",
  "contact.response": "Response",
  "contact.response.value": "Within 48 business hours",
  "contact.success.title": "Message sent!",
  "contact.success.body":
    "Thank you for reaching out. We have received your message and will reply as soon as possible.",
  "contact.success.another": "Send another message",
  "contact.name": "Full name",
  "contact.name.placeholder": "Your name",
  "contact.email": "Email address",
  "contact.subject": "Subject",
  "contact.subject.placeholder": "The subject of your message",
  "contact.message": "Message",
  "contact.message.placeholder": "Write your message here...",
  "contact.send": "Send message",
  "contact.sending": "Sending...",
  "contact.error.default": "An error occurred. Please try again.",

  /* ── Contact validation ── */
  "contact.val.name.min": "Name must be at least 2 characters",
  "contact.val.name.max": "Name is too long",
  "contact.val.name.required": "Name is required",
  "contact.val.email.invalid": "Invalid email address",
  "contact.val.email.required": "Email is required",
  "contact.val.subject.min": "Subject must be at least 3 characters",
  "contact.val.subject.max": "Subject is too long",
  "contact.val.subject.required": "Subject is required",
  "contact.val.message.min": "Message must be at least 10 characters",
  "contact.val.message.max": "Message is too long",
  "contact.val.message.required": "Message is required",

  /* ── Account Deletion ── */
  "delete.title": "Account Deletion Request",
  "delete.sub":
    "We're sorry to see you go. Deleting your account will permanently erase all your data.",
  "delete.warning.title": "Warning: Irreversible Action",
  "delete.warning.body":
    "Deleting your account will erase all your personal data, favorites and history. For partners, your venues and events will be removed from the platform.",
  "delete.success.title": "Request received",
  "delete.success.body":
    "Your account deletion request has been registered. It will be processed within 30 days in accordance with GDPR. You will receive a confirmation email once the deletion is complete.",
  "delete.success.contact": "If you have any questions, contact us at",
  "delete.name": "Full name",
  "delete.name.placeholder": "Your name as it appears in the app",
  "delete.email": "Email address linked to the account",
  "delete.type": "Account type",
  "delete.type.placeholder": "Select account type",
  "delete.type.user": "User (Mobile App)",
  "delete.type.partner": "Partner / Organization (Organizer)",
  "delete.reason": "Reason for deletion (Optional)",
  "delete.reason.placeholder": "Why do you want to leave?",
  "delete.reason.not_useful": "The app is not useful to me",
  "delete.reason.privacy": "Privacy concerns",
  "delete.reason.too_many_emails": "Too many notifications",
  "delete.reason.other": "Other reason",
  "delete.confirm.label": "I confirm I want to permanently delete my account",
  "delete.confirm.desc":
    "I understand this action is irreversible and I will lose access to all my data.",
  "delete.submit": "Submit deletion request",
  "delete.submitting": "Submitting...",
  "delete.error.confirm": "You must confirm the deletion.",
  "delete.error.server": "Server error. Please try again later.",
  "delete.error.network": "Network error. Please try again.",

  /* ── Privacy ── */
  "privacy.title": "Privacy Policy",
  "privacy.contact.intro":
    "For any questions about this policy or your data:",

  /* ── Terms ── */
  "terms.title": "Terms of Use",
  "terms.contact.title": "Contact",
};

export const translations: Record<Lang, Record<string, string>> = { fr, en };
