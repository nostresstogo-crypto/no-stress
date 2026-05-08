
export const LAST_UPDATED_FR = "Dernière mise à jour : 6 mai 2026";
export const LAST_UPDATED_EN = "Last updated: May 6, 2026";

export const CONTACT = {
  email: "nostresstogo@gmail.com",
  whatsapp: "+228 91 00 35 01",
  address: "Lomé, Togo",
};

export const PRIVACY_FR = [
  {
    title: "1. Introduction",
    paragraphs: [
      "NoStress est une plateforme de découverte d'événements et de billetterie mobile opérée depuis Lomé, Togo, à destination des marchés togolais et béninois. La protection de vos données personnelles est une priorité absolue. Cette politique explique quelles données nous collectons, pourquoi, et vos droits sur celles-ci.",
    ],
  },
  {
    title: "2. Données que nous collectons",
    bullets: [
      "Compte : nom, adresse e-mail, mot de passe (haché avec bcrypt), numéro de téléphone (optionnel), pays (Togo ou Bénin).",
      "Vérification d'identité : code à 6 chiffres envoyé par e-mail pour valider votre adresse.",
      "Géolocalisation : uniquement avec votre consentement explicite, pour vous proposer les événements les plus proches.",
      "Activité : billets achetés, événements favoris, historique de connexion.",
      "Données partenaires : nom commercial, type d'activité, ville, description, site web, événements publiés, photos des lieux et événements.",
      "Techniques : jetons de session (JWT + refresh token), agent utilisateur, adresse IP (limitation de débit anti-abus).",
    ],
  },
  {
    title: "3. Utilisation des données",
    bullets: [
      "Fournir l'accès à l'application et générer vos billets QR.",
      "Personnaliser les recommandations selon votre ville et vos centres d'intérêt.",
      "Vous notifier des événements à proximité (si la géolocalisation est activée) ou de modifications importantes.",
      "Sécuriser nos services : prévention des fraudes, limitation de débit, vérification des comptes.",
      "Améliorer le service de manière agrégée et anonymisée.",
    ],
  },
  {
    title: "4. Partage des données",
    paragraphs: ["Nous ne vendons jamais vos données personnelles. Nous partageons uniquement le strict nécessaire avec :"],
    bullets: [
      "Organisateurs d'événements : nom et référence du billet, pour validation à l'entrée.",
      "Prestataires de paiement mobile : uniquement les données nécessaires à la transaction. Nous ne stockons jamais vos codes PIN ni informations bancaires.",
      "Hébergeurs / stockage : OVH (hébergement applicatif), PostgreSQL (base de données), Google Cloud Storage (images d'événements et lieux).",
      "Notifications e-mail : serveur SMTP utilisé pour les codes de vérification et notifications de compte.",
      "Autorités légales : uniquement si la loi togolaise ou béninoise l'exige.",
    ],
  },
  {
    title: "5. Conservation des données",
    bullets: [
      "Compte actif : tant que vous utilisez le service.",
      "Compte supprimé : suppression définitive sous 30 jours après votre demande (page « Suppression de compte »).",
      "Jetons de session révoqués : conservés 90 jours pour audit puis purgés.",
      "Logs de sécurité : 12 mois maximum.",
    ],
  },
  {
    title: "6. Sécurité",
    bullets: [
      "Mots de passe hachés avec bcrypt (coût 12).",
      "Authentification par jeton signé (JWT) avec rotation automatique des refresh tokens.",
      "Limitation du nombre de tentatives de connexion par adresse IP.",
      "Connexions HTTPS chiffrées de bout en bout.",
      "Vérification obligatoire de l'adresse e-mail à l'inscription.",
    ],
  },
  {
    title: "7. Vos droits",
    paragraphs: ["Vous disposez à tout moment des droits suivants :"],
    bullets: [
      "Accès : consulter vos données depuis l'onglet « Compte ».",
      "Rectification : modifier vos informations directement dans l'application.",
      "Suppression : demander la suppression définitive de votre compte via la page « Suppression de compte » du site web.",
      "Opposition : désactiver les notifications de géolocalisation à tout moment dans les réglages.",
      "Portabilité : obtenir une copie de vos données sur simple demande à l'adresse de contact.",
    ],
  },
  {
    title: "8. Mineurs",
    paragraphs: [
      "NoStress est interdit aux moins de 16 ans. Nous ne collectons sciemment aucune donnée concernant des mineurs de moins de 16 ans. Si vous pensez qu'un mineur s'est inscrit, contactez-nous afin que nous puissions supprimer son compte.",
    ],
  },
  {
    title: "9. Notifications push",
    paragraphs: [
      "Si vous activez les notifications push, nous utilisons un identifiant fourni par Apple ou Google pour vous envoyer des messages relatifs à vos billets, demandes de partenaire, ou événements à proximité. Vous pouvez les désactiver à tout moment depuis les réglages de votre téléphone.",
    ],
  },
  {
    title: "10. Cookies (site web)",
    paragraphs: [
      "Notre site web utilise uniquement des cookies essentiels nécessaires au bon fonctionnement (session, préférences). Aucun cookie publicitaire ou de profilage n'est déposé.",
    ],
  },
  {
    title: "11. Modifications",
    paragraphs: [
      "Nous pouvons mettre à jour cette politique. Les modifications majeures vous seront notifiées via l'application ou par e-mail. La date en haut de page reflète la dernière mise à jour.",
    ],
  },
];

export const PRIVACY_EN = [
  {
    title: "1. Introduction",
    paragraphs: [
      "NoStress is a mobile event discovery and ticketing platform operated from Lomé, Togo, for the Togolese and Beninese markets. Protecting your personal data is an absolute priority. This policy explains what data we collect, why, and your rights regarding it.",
    ],
  },
  {
    title: "2. Data we collect",
    bullets: [
      "Account: name, email address, password (hashed with bcrypt), phone number (optional), country (Togo or Benin).",
      "Identity verification: 6-digit code sent by email to validate your address.",
      "Geolocation: only with your explicit consent, to suggest the closest events.",
      "Activity: tickets purchased, favorite events, login history.",
      "Partner data: business name, business type, city, description, website, published events, venue and event photos.",
      "Technical: session tokens (JWT + refresh token), user agent, IP address (anti-abuse rate limiting).",
    ],
  },
  {
    title: "3. Use of data",
    bullets: [
      "Provide access to the app and generate your QR tickets.",
      "Personalize recommendations based on your city and interests.",
      "Notify you of nearby events (if geolocation is enabled) or important changes.",
      "Secure our services: fraud prevention, rate limiting, account verification.",
      "Improve the service in an aggregated and anonymized way.",
    ],
  },
  {
    title: "4. Data sharing",
    paragraphs: ["We never sell your personal data. We share only what is strictly necessary with:"],
    bullets: [
      "Event organizers: name and ticket reference, for validation at the entrance.",
      "Mobile payment providers: only the data needed for the transaction. We never store your PIN codes or banking information.",
      "Hosting / storage: OVH (application hosting), PostgreSQL (database), Google Cloud Storage (event and venue images).",
      "Email notifications: SMTP server used for verification codes and account notifications.",
      "Legal authorities: only if Togolese or Beninese law requires it.",
    ],
  },
  {
    title: "5. Data retention",
    bullets: [
      "Active account: as long as you use the service.",
      "Deleted account: permanent deletion within 30 days of your request (\"Account deletion\" page).",
      "Revoked session tokens: kept 90 days for audit, then purged.",
      "Security logs: 12 months maximum.",
    ],
  },
  {
    title: "6. Security",
    bullets: [
      "Passwords hashed with bcrypt (cost 12).",
      "Signed token authentication (JWT) with automatic refresh token rotation.",
      "Limit on the number of login attempts per IP address.",
      "End-to-end encrypted HTTPS connections.",
      "Mandatory email address verification at registration.",
    ],
  },
  {
    title: "7. Your rights",
    paragraphs: ["You have the following rights at any time:"],
    bullets: [
      "Access: view your data from the \"Account\" tab.",
      "Rectification: modify your information directly in the app.",
      "Deletion: request permanent deletion of your account via the \"Account deletion\" page on the website.",
      "Opt-out: disable geolocation notifications at any time in the settings.",
      "Portability: obtain a copy of your data upon request to the contact address.",
    ],
  },
  {
    title: "8. Minors",
    paragraphs: [
      "NoStress is forbidden to under-16s. We do not knowingly collect any data concerning minors under 16. If you believe a minor has registered, contact us so that we can delete the account.",
    ],
  },
  {
    title: "9. Push notifications",
    paragraphs: [
      "If you enable push notifications, we use an identifier provided by Apple or Google to send you messages related to your tickets, partner requests, or nearby events. You can disable them at any time from your phone settings.",
    ],
  },
  {
    title: "10. Cookies (website)",
    paragraphs: [
      "Our website uses only essential cookies necessary for proper operation (session, preferences). No advertising or profiling cookies are placed.",
    ],
  },
  {
    title: "11. Changes",
    paragraphs: [
      "We may update this policy. Major changes will be notified to you via the app or by email. The date at the top of the page reflects the last update.",
    ],
  },
];

export const TERMS_FR = [
  {
    title: "1. Acceptation des conditions",
    paragraphs: [
      "En téléchargeant, installant ou utilisant l'application mobile NoStress (ci-après « l'Application ») ou le site no-stress.net, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service.",
      "Le service est opéré par NoStress, basée à Lomé, Togo, et disponible au Togo et au Bénin.",
    ],
  },
  {
    title: "2. Description du service",
    paragraphs: ["NoStress est une plateforme de découverte d'événements et de billetterie numérique. Elle permet :"],
    bullets: [
      "De découvrir des événements locaux (concerts, festivals, soirées, conférences, etc.).",
      "D'acheter des billets électroniques via les solutions de paiement mobile intégrées.",
      "De consulter les lieux et établissements partenaires vérifiés.",
      "De gérer ses billets et favoris depuis son profil.",
      "Aux organisateurs de publier et gérer leurs événements et leurs lieux après validation par l'équipe NoStress.",
    ],
  },
  {
    title: "3. Inscription et compte utilisateur",
    paragraphs: [
      "Pour accéder aux fonctionnalités complètes (achat de billets, favoris), vous devez créer un compte avec des informations exactes et à jour. Une vérification d'adresse e-mail par code à 6 chiffres est obligatoire.",
      "Vous devez avoir au moins 16 ans pour créer un compte. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.",
    ],
  },
  {
    title: "4. Comptes partenaires (structures)",
    paragraphs: [
      "Les organisateurs et établissements souhaitant s'inscrire en tant que partenaires soumettent une demande via le formulaire d'inscription. Toute inscription partenaire est soumise à validation manuelle par l'équipe NoStress avant d'être visible.",
      "NoStress se réserve le droit d'approuver ou de rejeter toute demande, ainsi que de suspendre ou supprimer un compte partenaire en cas de violation des CGU.",
      "En vous inscrivant en tant que partenaire, vous vous engagez à :",
    ],
    bullets: [
      "Fournir des informations exactes sur votre entreprise, vos lieux et vos événements (au moins une photo par lieu et par événement, jusqu'à 3 photos par galerie).",
      "Honorer les billets vendus via la plateforme.",
      "Respecter la législation applicable à l'organisation d'événements.",
      "Ne pas publier de contenu offensant, trompeur ou illicite.",
    ],
  },
  {
    title: "5. Lieux et événements",
    paragraphs: [
      "Tout lieu et tout événement publié par un partenaire est soumis à validation manuelle par l'équipe NoStress avant publication sur l'application. Une photo de couverture est obligatoire et une galerie de jusqu'à 3 photos peut être ajoutée.",
      "NoStress se réserve le droit de rejeter tout contenu jugé inapproprié, trompeur, ou de mauvaise qualité, sans préavis.",
    ],
  },
  {
    title: "6. Achat de billets et paiements",
    paragraphs: [
      "Les achats de billets sont définitifs et non remboursables, sauf en cas d'annulation de l'événement par l'organisateur. En cas d'annulation, NoStress facilite le remboursement selon les conditions de l'organisateur.",
      "Les transactions sont traitées via des partenaires de paiement mobile agréés. NoStress ne stocke pas les informations de paiement sur ses serveurs.",
    ],
  },
  {
    title: "7. Propriété intellectuelle",
    paragraphs: [
      "L'ensemble du contenu de l'Application (textes, images, logos, icônes, code source) est la propriété exclusive de NoStress ou de ses partenaires. Toute reproduction sans autorisation écrite est interdite.",
      "En publiant du contenu (images, descriptions d'événements et de lieux), les partenaires accordent à NoStress une licence non exclusive et gratuite pour utiliser ce contenu à des fins de promotion du service.",
    ],
  },
  {
    title: "8. Données personnelles",
    paragraphs: [
      "La collecte et le traitement de vos données sont régis par notre Politique de Confidentialité. En utilisant le service, vous consentez à ce traitement.",
    ],
  },
  {
    title: "9. Contenu interdit",
    paragraphs: ["Il est strictement interdit d'utiliser NoStress pour :"],
    bullets: [
      "Publier des informations fausses ou trompeuses sur des événements ou lieux.",
      "Vendre des billets sans autorisation de l'organisateur.",
      "Usurper l'identité d'une autre personne ou entité.",
      "Diffuser des contenus illicites, haineux, discriminatoires ou contraires à la loi.",
      "Tenter de compromettre la sécurité ou le fonctionnement de la plateforme.",
      "Contourner les mécanismes de vérification d'adresse e-mail ou de limitation de débit.",
    ],
  },
  {
    title: "10. Limitation de responsabilité",
    paragraphs: [
      "NoStress agit en tant qu'intermédiaire entre les organisateurs et les utilisateurs. Nous ne pouvons être tenus responsables des annulations, modifications ou problèmes liés à des événements organisés par des tiers, dans la limite permise par la loi.",
      "L'Application est fournie « en l'état ». Nous ne garantissons pas une disponibilité ininterrompue et ne pouvons être tenus responsables des dommages résultant d'une interruption temporaire.",
    ],
  },
  {
    title: "11. Suspension et suppression de compte",
    paragraphs: [
      "NoStress peut suspendre ou supprimer tout compte qui violerait les CGU, sans préavis et sans compensation.",
      "Vous pouvez à tout moment demander la suppression de votre compte depuis l'écran « Compte » de l'application ou via la page « Suppression de compte » du site web. La suppression est définitive et entraîne la perte de toutes vos données, billets et favoris.",
    ],
  },
  {
    title: "12. Modifications des CGU",
    paragraphs: [
      "NoStress peut modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.",
    ],
  },
  {
    title: "13. Droit applicable et litiges",
    paragraphs: [
      "Les présentes CGU sont soumises au droit togolais. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents de Lomé, Togo, seront seuls compétents.",
    ],
  },
];

export const TERMS_EN = [
  {
    title: "1. Acceptance of terms",
    paragraphs: [
      "By downloading, installing, or using the NoStress mobile app (the \"App\") or the no-stress.net website, you agree without reservation to these Terms of Use. If you do not accept these terms, please do not use the service.",
      "The service is operated by NoStress, based in Lomé, Togo, and available in Togo and Benin.",
    ],
  },
  {
    title: "2. Service description",
    paragraphs: ["NoStress is an event discovery and digital ticketing platform. It allows you to:"],
    bullets: [
      "Discover local events (concerts, festivals, parties, conferences, etc.).",
      "Buy electronic tickets via integrated mobile payment solutions.",
      "Browse verified partner venues and businesses.",
      "Manage your tickets and favorites from your profile.",
      "Allow organizers to publish and manage their events and venues after validation by the NoStress team.",
    ],
  },
  {
    title: "3. Registration and user account",
    paragraphs: [
      "To access full features (ticket purchases, favorites), you must create an account with accurate and up-to-date information. Email verification with a 6-digit code is mandatory.",
      "You must be at least 16 years old to create an account. You are responsible for keeping your credentials confidential and for any activity carried out from your account.",
    ],
  },
  {
    title: "4. Partner accounts (businesses)",
    paragraphs: [
      "Organizers and businesses wishing to register as partners submit a request via the registration form. All partner registrations are subject to manual validation by the NoStress team before becoming visible.",
      "NoStress reserves the right to approve or reject any request, and to suspend or delete a partner account in case of breach of the Terms.",
      "By registering as a partner, you agree to:",
    ],
    bullets: [
      "Provide accurate information about your business, venues, and events (at least one photo per venue and per event, up to 3 photos per gallery).",
      "Honor tickets sold through the platform.",
      "Comply with the laws applicable to event organization.",
      "Not publish offensive, misleading, or unlawful content.",
    ],
  },
  {
    title: "5. Venues and events",
    paragraphs: [
      "Every venue and event published by a partner is subject to manual validation by the NoStress team before publication on the app. A cover photo is mandatory and a gallery of up to 3 photos may be added.",
      "NoStress reserves the right to reject any content deemed inappropriate, misleading, or of poor quality, without notice.",
    ],
  },
  {
    title: "6. Ticket purchases and payments",
    paragraphs: [
      "Ticket purchases are final and non-refundable, except in case of event cancellation by the organizer. In case of cancellation, NoStress facilitates refunds according to the organizer's terms.",
      "Transactions are processed via licensed mobile payment partners. NoStress does not store payment information on its servers.",
    ],
  },
  {
    title: "7. Intellectual property",
    paragraphs: [
      "All content in the App (texts, images, logos, icons, source code) is the exclusive property of NoStress or its partners. Any reproduction without written authorization is prohibited.",
      "By publishing content (images, descriptions of events and venues), partners grant NoStress a non-exclusive, royalty-free license to use this content for the purpose of promoting the service.",
    ],
  },
  {
    title: "8. Personal data",
    paragraphs: [
      "The collection and processing of your data is governed by our Privacy Policy. By using the service, you consent to this processing.",
    ],
  },
  {
    title: "9. Prohibited content",
    paragraphs: ["It is strictly forbidden to use NoStress to:"],
    bullets: [
      "Publish false or misleading information about events or venues.",
      "Sell tickets without the organizer's authorization.",
      "Impersonate another person or entity.",
      "Distribute unlawful, hateful, discriminatory or illegal content.",
      "Attempt to compromise the security or operation of the platform.",
      "Bypass email verification or rate-limiting mechanisms.",
    ],
  },
  {
    title: "10. Limitation of liability",
    paragraphs: [
      "NoStress acts as an intermediary between organizers and users. We cannot be held liable for cancellations, changes, or issues related to events organized by third parties, to the extent permitted by law.",
      "The App is provided \"as is\". We do not guarantee uninterrupted availability and cannot be held liable for damages resulting from a temporary interruption.",
    ],
  },
  {
    title: "11. Account suspension and deletion",
    paragraphs: [
      "NoStress may suspend or delete any account that violates the Terms, without notice and without compensation.",
      "You may request deletion of your account at any time from the \"Account\" screen of the app or via the \"Account deletion\" page on the website. Deletion is permanent and results in the loss of all your data, tickets, and favorites.",
    ],
  },
  {
    title: "12. Changes to the Terms",
    paragraphs: [
      "NoStress may modify these Terms at any time. Changes take effect upon publication. Continued use of the service after modification constitutes acceptance of the new terms.",
    ],
  },
  {
    title: "13. Applicable law and disputes",
    paragraphs: [
      "These Terms are governed by Togolese law. In case of dispute, the parties undertake to seek an amicable solution. Failing this, the competent courts of Lomé, Togo, shall have sole jurisdiction.",
    ],
  },
];
