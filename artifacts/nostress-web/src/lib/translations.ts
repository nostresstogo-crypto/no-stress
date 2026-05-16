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
    "L'application de découverte d'événements et de vie nocturne en Afrique. Trouvez les meilleurs concerts, festivals, bars, clubs et restaurants partout sur le continent.",
  "footer.links": "Liens Rapides",
  "footer.terms": "Conditions d'utilisation",
  "footer.privacy": "Politique de confidentialité",
  "footer.delete": "Suppression de compte",
  "footer.contact": "Contact",
  "footer.rights": "Tous droits réservés.",
  "footer.proudly": "Fièrement Togolais",

  /* ── Home – Hero ── */
  "home.hero.title": "Vivez l'énergie de l'",
  "home.hero.country": "Afrique",
  "home.hero.title2": ", sans stress.",
  "home.hero.sub":
    "Découvrez les meilleurs événements, bars, restaurants, clubs et lieux de divertissement partout en Afrique. La vie nocturne et festive à portée de main.",
  "home.hero.appstore": "App Store",
  "home.hero.googleplay": "Google Play",

  /* ── Home – Features ── */
  "home.features.title": "Tout ce qu'il vous faut pour sortir",
  "home.features.sub":
    "NoStress vous connecte aux meilleurs événements et lieux de divertissement en Afrique, avec l'intelligence artificielle comme guide personnel.",
  "home.features.f1.title": "Découverte",
  "home.features.f1.desc":
    "Explorez des événements exclusifs, concerts, festivals et soirées partout en Afrique.",
  "home.features.f2.title": "Recommandations IA",
  "home.features.f2.desc":
    "L'IA analyse vos goûts et votre ville pour vous suggérer les événements et lieux qui vous correspondent vraiment.",
  "home.features.f3.title": "Carte Interactive",
  "home.features.f3.desc":
    "Localisez les bars, clubs, restaurants et lieux d'événements autour de vous.",
  "home.features.f4.title": "Espace Partenaire",
  "home.features.f4.desc":
    "Créez et gérez vos événements, mettez en avant votre établissement et touchez une audience plus large.",

  /* ── Home – App Mockup ── */
  "home.app.title": "L'expérience NoStress au bout des doigts",
  "home.app.sub":
    "Une interface fluide, pensée pour la nuit. Parcourez les événements à venir, explorez les bars, clubs, restaurants et lounges près de chez vous — et ne ratez plus aucune sortie.",
  "home.app.li1": "Recommandations personnalisées par l'IA",
  "home.app.li2": "Notifications en temps réel pour vos événements et lieux favoris",
  "home.app.li3": "Carte interactive des lieux et événements près de vous",
  "home.app.li4": "Mode sombre exclusif pour le confort visuel",

  /* ── Home – Pricing ── */
  "home.pricing.title": "Pour les Organisateurs & Établissements",
  "home.pricing.sub":
    "Rejoignez NoStress et boostez la visibilité de vos événements et établissements auprès d'un large public africain.",
  "home.pricing.payment": "Paiements acceptés via Flooz et TMoney",
  "home.pricing.soon": "Gratuit (beta)",
  "home.pricing.soon_cta": "Bientôt disponible",
  "home.pricing.popular": "Populaire",
  "home.pricing.cta": "Commencer",
  "home.pricing.p1.name": "Gratuit",
  "home.pricing.p1.desc": "Pour démarrer sur la plateforme",
  "home.pricing.p1.f1": "1 événement actif",
  "home.pricing.p1.f2": "1 lieu référencé",
  "home.pricing.p1.f3": "Visibilité standard",
  "home.pricing.p1.f4": "Support par email",
  "home.pricing.p2.name": "Standard",
  "home.pricing.p2.suffix": "/mois",
  "home.pricing.p2.desc": "Pour les clubs et promoteurs actifs",
  "home.pricing.p2.f1": "Événements illimités",
  "home.pricing.p2.f2": "Jusqu'à 3 lieux référencés",
  "home.pricing.p2.f3": "Mise en avant dans l'application",
  "home.pricing.p2.f4": "Notifications push à vos abonnés",
  "home.pricing.p2.f5": "Statistiques de base",
  "home.pricing.p2.f6": "Support prioritaire",
  "home.pricing.p3.name": "Pro",
  "home.pricing.p3.suffix": "/mois",
  "home.pricing.p3.desc": "Pour les grands établissements et festivals",
  "home.pricing.p3.f1": "Tout le Standard inclus",
  "home.pricing.p3.f2": "Lieux illimités",
  "home.pricing.p3.f3": "Badge partenaire vérifié",
  "home.pricing.p3.f4": "Statistiques avancées",
  "home.pricing.p3.f5": "Visibilité boostée à travers l'Afrique",
  "home.pricing.p3.f6": "Account manager dédié",

  /* ── Home – Testimonials ── */
  "home.testimonials.title": "Ce qu'ils en disent",
  "home.testimonials.t1.quote":
    "Enfin une appli africaine qui rassemble tous les événements au même endroit ! Je découvre des concerts, des lounges et des soirées que je n'aurais jamais trouvés autrement.",
  "home.testimonials.t1.role": "Étudiant, Lomé",
  "home.testimonials.t2.quote":
    "Depuis que mon club est sur NoStress, ma visibilité a doublé chaque week-end. La gestion de mes événements et la mise en avant de mon établissement n'ont jamais été aussi simples.",
  "home.testimonials.t2.role": "Propriétaire de Club",
  "home.testimonials.t3.quote":
    "J'ai découvert des festivals incroyables que je n'aurais jamais trouvés autrement. L'interface est magnifique, fluide et vraiment pensée pour les sorties.",
  "home.testimonials.t3.role": "Designer",

  /* ── Home – CTA ── */
  "home.cta.title": "Prêt à sortir ?",
  "home.cta.sub":
    "Rejoignez des milliers d'Africains qui utilisent NoStress pour découvrir les meilleurs événements et lieux de divertissement.",
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
    "The event discovery and nightlife app for Africa. Find the best concerts, festivals, bars, clubs and restaurants across the continent.",
  "footer.links": "Quick Links",
  "footer.terms": "Terms of Use",
  "footer.privacy": "Privacy Policy",
  "footer.delete": "Account Deletion",
  "footer.contact": "Contact",
  "footer.rights": "All rights reserved.",
  "footer.proudly": "Proudly Togolese",

  /* ── Home – Hero ── */
  "home.hero.title": "Feel the energy of",
  "home.hero.country": "Africa",
  "home.hero.title2": ", stress-free.",
  "home.hero.sub":
    "Discover the best events, bars, restaurants, clubs and entertainment venues across Africa. Nightlife and festivities at your fingertips.",
  "home.hero.appstore": "App Store",
  "home.hero.googleplay": "Google Play",

  /* ── Home – Features ── */
  "home.features.title": "Everything you need to go out",
  "home.features.sub":
    "NoStress connects you to the best events and entertainment venues across Africa, with AI as your personal guide.",
  "home.features.f1.title": "Discovery",
  "home.features.f1.desc": "Explore exclusive events, concerts, festivals and parties across Africa.",
  "home.features.f2.title": "AI Recommendations",
  "home.features.f2.desc":
    "AI analyses your tastes and city to suggest the events and venues that truly match you.",
  "home.features.f3.title": "Interactive Map",
  "home.features.f3.desc": "Locate bars, clubs, restaurants and event venues around you.",
  "home.features.f4.title": "Partner Space",
  "home.features.f4.desc": "Create and manage your events, showcase your venue and reach a wider audience.",

  /* ── Home – App Mockup ── */
  "home.app.title": "The NoStress experience at your fingertips",
  "home.app.sub":
    "A smooth interface built for the night. Browse upcoming events, explore bars, clubs, restaurants and lounges near you — and never miss a night out.",
  "home.app.li1": "AI-powered personalised recommendations",
  "home.app.li2": "Real-time notifications for your favourite events and venues",
  "home.app.li3": "Interactive map of venues and events near you",
  "home.app.li4": "Exclusive dark mode for visual comfort",

  /* ── Home – Pricing ── */
  "home.pricing.title": "For Organizers & Venues",
  "home.pricing.sub":
    "Join NoStress and boost the visibility of your events and venues to a wide African audience.",
  "home.pricing.payment": "Payments accepted via Flooz and TMoney",
  "home.pricing.soon": "Free (beta)",
  "home.pricing.soon_cta": "Coming soon",
  "home.pricing.popular": "Popular",
  "home.pricing.cta": "Get started",
  "home.pricing.p1.name": "Free",
  "home.pricing.p1.desc": "To get started on the platform",
  "home.pricing.p1.f1": "1 active event",
  "home.pricing.p1.f2": "1 listed venue",
  "home.pricing.p1.f3": "Standard visibility",
  "home.pricing.p1.f4": "Email support",
  "home.pricing.p2.name": "Standard",
  "home.pricing.p2.suffix": "/month",
  "home.pricing.p2.desc": "For active clubs and promoters",
  "home.pricing.p2.f1": "Unlimited events",
  "home.pricing.p2.f2": "Up to 3 listed venues",
  "home.pricing.p2.f3": "Featured in the app",
  "home.pricing.p2.f4": "Push notifications to your followers",
  "home.pricing.p2.f5": "Basic statistics",
  "home.pricing.p2.f6": "Priority support",
  "home.pricing.p3.name": "Pro",
  "home.pricing.p3.suffix": "/month",
  "home.pricing.p3.desc": "For large venues and festivals",
  "home.pricing.p3.f1": "Everything in Standard",
  "home.pricing.p3.f2": "Unlimited venues",
  "home.pricing.p3.f3": "Verified partner badge",
  "home.pricing.p3.f4": "Advanced statistics",
  "home.pricing.p3.f5": "Boosted visibility across Africa",
  "home.pricing.p3.f6": "Dedicated account manager",

  /* ── Home – Testimonials ── */
  "home.testimonials.title": "What they say",
  "home.testimonials.t1.quote":
    "Finally an African app that brings all events together in one place! I discover concerts, lounges and parties I would never have found otherwise.",
  "home.testimonials.t1.role": "Student, Lomé",
  "home.testimonials.t2.quote":
    "Since my club joined NoStress, my visibility has doubled every weekend. Managing my events and showcasing my venue has never been this easy.",
  "home.testimonials.t2.role": "Club Owner",
  "home.testimonials.t3.quote":
    "I discovered incredible festivals I would never have found otherwise. The interface is beautiful, smooth and truly built for nights out.",
  "home.testimonials.t3.role": "Designer",

  /* ── Home – CTA ── */
  "home.cta.title": "Ready to go out?",
  "home.cta.sub":
    "Join thousands of Africans who use NoStress to discover the best events and entertainment venues.",
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
