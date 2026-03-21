export type Lang = "fr" | "en";

export const translations = {
  fr: {
    // Nav
    home: "Accueil",
    venues: "Lieux",
    tickets: "Billets",
    account: "Compte",
    admin: "Admin",

    // Home
    discover: "Découvrez",
    allEvents: "Tous les événements",
    searchPlaceholder: "Rechercher un événement...",
    allCities: "Toutes les villes",
    sponsored: "Sponsorisé",
    free: "Gratuit",
    seeAll: "Voir tout",
    upcomingEvents: "Événements à venir",
    popularVenues: "Lieux populaires",

    // Categories
    concerts: "Concerts",
    nightclubs: "Boîtes de nuit",
    bars: "Bars",
    restaurants: "Restaurants",
    beach: "Plage",
    cinema: "Cinéma",
    hotels: "Hôtels",
    festivals: "Festivals",
    sport: "Sport",
    culture: "Culture",
    comedy: "Comédie",
    liveMusic: "Musique live",

    // Event detail
    description: "Description",
    location: "Localisation",
    ticketTypes: "Types de billets",
    buyTicket: "Acheter un billet",
    share: "Partager",
    vip: "VIP",
    standard: "Standard",
    addFavorite: "Ajouter aux favoris",
    removeFavorite: "Retirer des favoris",

    // Venues
    allTypes: "Tous les types",
    verified: "Vérifié",
    noVenues: "Aucun lieu trouvé",
    noEvents: "Aucun événement trouvé",

    // Ticketing
    selectTickets: "Sélectionner les billets",
    paymentMethod: "Méthode de paiement",
    phoneNumber: "Numéro de téléphone",
    quantity: "Quantité",
    total: "Total",
    confirm: "Confirmer",
    processing: "Traitement en cours...",
    paymentSuccess: "Paiement réussi!",
    paymentError: "Erreur de paiement",
    enterPhone: "Entrez votre numéro",

    // Auth
    login: "Se connecter",
    register: "S'inscrire",
    email: "Email",
    password: "Mot de passe",
    name: "Nom complet",
    phone: "Téléphone",
    loginTitle: "Bon retour!",
    registerTitle: "Créer un compte",
    noAccount: "Pas de compte?",
    hasAccount: "Déjà un compte?",
    orContinueWith: "Ou continuer avec",
    logout: "Se déconnecter",
    loginRequired: "Connexion requise",

    // Account
    myAccount: "Mon Compte",
    favorites: "Favoris",
    notifications: "Notifications",
    noFavorites: "Aucun favori pour l'instant",
    noNotifications: "Aucune notification",
    language: "Langue",
    subscription: "Abonnement",

    // Structure dashboard
    dashboard: "Tableau de bord",
    myEvents: "Mes événements",
    myVenues: "Mes lieux",
    createEvent: "Créer un événement",
    createVenue: "Créer un lieu",
    editEvent: "Modifier l'événement",
    editVenue: "Modifier le lieu",
    manageTickets: "Gérer les billets",
    myPlan: "Mon abonnement",
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    save: "Enregistrer",
    cancel: "Annuler",
    title: "Titre",
    date: "Date",
    city: "Ville",
    category: "Catégorie",
    price: "Prix",
    image: "Image (URL)",
    address: "Adresse",
    venueType: "Type de lieu",

    // Subscriptions
    choosePlan: "Choisir un abonnement",
    perMonth: "/mois",
    currentPlan: "Plan actuel",
    upgrade: "Passer au plan",
    freePlan: "Gratuit",
    proPlan: "Pro",
    premiumPlan: "Premium",

    // Admin
    pendingEvents: "Événements en attente",
    pendingVenues: "Lieux non vérifiés",
    approve: "Approuver",
    reject: "Rejeter",
    verify: "Vérifier",
    adminPanel: "Panel Admin",

    // Common
    loading: "Chargement...",
    error: "Erreur",
    retry: "Réessayer",
    back: "Retour",
    noData: "Aucune donnée",
  },
  en: {
    // Nav
    home: "Home",
    venues: "Venues",
    tickets: "Tickets",
    account: "Account",
    admin: "Admin",

    // Home
    discover: "Discover",
    allEvents: "All events",
    searchPlaceholder: "Search for an event...",
    allCities: "All cities",
    sponsored: "Sponsored",
    free: "Free",
    seeAll: "See all",
    upcomingEvents: "Upcoming Events",
    popularVenues: "Popular Venues",

    // Categories
    concerts: "Concerts",
    nightclubs: "Nightclubs",
    bars: "Bars",
    restaurants: "Restaurants",
    beach: "Beach",
    cinema: "Cinema",
    hotels: "Hotels",
    festivals: "Festivals",
    sport: "Sport",
    culture: "Culture",
    comedy: "Comedy",
    liveMusic: "Live Music",

    // Event detail
    description: "Description",
    location: "Location",
    ticketTypes: "Ticket Types",
    buyTicket: "Buy Ticket",
    share: "Share",
    vip: "VIP",
    standard: "Standard",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",

    // Venues
    allTypes: "All types",
    verified: "Verified",
    noVenues: "No venues found",
    noEvents: "No events found",

    // Ticketing
    selectTickets: "Select Tickets",
    paymentMethod: "Payment Method",
    phoneNumber: "Phone Number",
    quantity: "Quantity",
    total: "Total",
    confirm: "Confirm",
    processing: "Processing...",
    paymentSuccess: "Payment successful!",
    paymentError: "Payment error",
    enterPhone: "Enter your phone",

    // Auth
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    name: "Full Name",
    phone: "Phone",
    loginTitle: "Welcome back!",
    registerTitle: "Create an account",
    noAccount: "No account?",
    hasAccount: "Already have an account?",
    orContinueWith: "Or continue with",
    logout: "Logout",
    loginRequired: "Login Required",

    // Account
    myAccount: "My Account",
    favorites: "Favorites",
    notifications: "Notifications",
    noFavorites: "No favorites yet",
    noNotifications: "No notifications",
    language: "Language",
    subscription: "Subscription",

    // Structure dashboard
    dashboard: "Dashboard",
    myEvents: "My Events",
    myVenues: "My Venues",
    createEvent: "Create Event",
    createVenue: "Create Venue",
    editEvent: "Edit Event",
    editVenue: "Edit Venue",
    manageTickets: "Manage Tickets",
    myPlan: "My Plan",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    save: "Save",
    cancel: "Cancel",
    title: "Title",
    date: "Date",
    city: "City",
    category: "Category",
    price: "Price",
    image: "Image (URL)",
    address: "Address",
    venueType: "Venue Type",

    // Subscriptions
    choosePlan: "Choose a Plan",
    perMonth: "/month",
    currentPlan: "Current Plan",
    upgrade: "Upgrade to",
    freePlan: "Free",
    proPlan: "Pro",
    premiumPlan: "Premium",

    // Admin
    pendingEvents: "Pending Events",
    pendingVenues: "Unverified Venues",
    approve: "Approve",
    reject: "Reject",
    verify: "Verify",
    adminPanel: "Admin Panel",

    // Common
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    back: "Back",
    noData: "No data",
  },
};

export type TranslationKey = keyof typeof translations.fr;
