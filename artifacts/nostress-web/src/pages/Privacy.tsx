import React from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">Politique de Confidentialité</h1>
          <p className="text-muted-foreground mb-12">Dernière mise à jour : 20 avril 2026</p>

          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-li:text-muted-foreground">
            <h2>1. Introduction</h2>
            <p>
              NoStress est une plateforme de découverte d'événements et de billetterie mobile opérée depuis Lomé, Togo, à destination des marchés togolais et béninois. La protection de vos données personnelles est une priorité absolue. Cette politique explique quelles données nous collectons, pourquoi, et vos droits sur celles-ci.
            </p>

            <h2>2. Données que nous collectons</h2>
            <ul>
              <li><strong>Compte :</strong> nom, adresse e-mail, mot de passe (haché avec bcrypt), numéro de téléphone (optionnel), pays (Togo ou Bénin).</li>
              <li><strong>Vérification d'identité :</strong> code à 6 chiffres envoyé par e-mail pour valider votre adresse.</li>
              <li><strong>Géolocalisation :</strong> uniquement avec votre consentement explicite, pour vous proposer les événements les plus proches.</li>
              <li><strong>Activité :</strong> billets achetés, événements favoris, historique de connexion.</li>
              <li><strong>Données partenaires (structures) :</strong> nom commercial, type d'activité, ville, description, site web, événements publiés.</li>
              <li><strong>Techniques :</strong> jetons de session (JWT + refresh token), agent utilisateur, adresse IP (pour la limitation de débit anti-abus).</li>
            </ul>

            <h2>3. Utilisation des données</h2>
            <ul>
              <li>Fournir l'accès à l'application et générer vos billets QR.</li>
              <li>Personnaliser les recommandations selon votre ville et vos centres d'intérêt.</li>
              <li>Vous notifier des événements à proximité (si la géolocalisation est activée) ou de modifications importantes.</li>
              <li>Sécuriser nos services : prévention des fraudes, limitation de débit, vérification des comptes.</li>
              <li>Améliorer le service de manière agrégée et anonymisée.</li>
            </ul>

            <h2>4. Partage des données</h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Nous partageons uniquement le strict nécessaire avec :
            </p>
            <ul>
              <li><strong>Organisateurs d'événements :</strong> nom et référence du billet, pour validation à l'entrée.</li>
              <li><strong>Prestataires de paiement mobile :</strong> uniquement les données nécessaires à la transaction. Nous ne stockons jamais vos codes PIN ni informations bancaires.</li>
              <li><strong>Hébergeurs / stockage :</strong> Replit (hébergement applicatif et base PostgreSQL), Google Cloud Storage (images d'événements).</li>
              <li><strong>Notifications e-mail :</strong> serveur SMTP utilisé pour les codes de vérification et notifications de compte.</li>
              <li><strong>Autorités légales :</strong> uniquement si la loi togolaise ou béninoise l'exige.</li>
            </ul>

            <h2>5. Conservation des données</h2>
            <ul>
              <li>Compte actif : tant que vous utilisez le service.</li>
              <li>Compte supprimé : suppression définitive sous 30 jours après votre demande (voir <a href="/suppression-compte">page dédiée</a>).</li>
              <li>Jetons de session révoqués : conservés 90 jours pour audit puis purgés.</li>
              <li>Logs de sécurité : 12 mois maximum.</li>
            </ul>

            <h2>6. Sécurité</h2>
            <ul>
              <li>Mots de passe hachés avec bcrypt (coût 12).</li>
              <li>Authentification par jeton signé (JWT) avec rotation automatique des refresh tokens.</li>
              <li>Limitation du nombre de tentatives de connexion par adresse IP.</li>
              <li>Connexions HTTPS chiffrées de bout en bout.</li>
              <li>Vérification obligatoire de l'adresse e-mail à l'inscription.</li>
            </ul>

            <h2>7. Vos droits</h2>
            <p>Vous disposez à tout moment des droits suivants :</p>
            <ul>
              <li><strong>Accès :</strong> consulter vos données depuis l'onglet « Compte ».</li>
              <li><strong>Rectification :</strong> modifier vos informations directement dans l'application.</li>
              <li><strong>Suppression :</strong> demander la suppression définitive de votre compte via la <a href="/suppression-compte">page suppression</a>.</li>
              <li><strong>Opposition :</strong> désactiver les notifications de géolocalisation à tout moment dans les réglages.</li>
              <li><strong>Portabilité :</strong> obtenir une copie de vos données sur simple demande à l'adresse ci-dessous.</li>
            </ul>

            <h2>8. Mineurs</h2>
            <p>
              NoStress est interdit aux moins de 16 ans. Nous ne collectons sciemment aucune donnée concernant des mineurs de moins de 16 ans. Si vous pensez qu'un mineur s'est inscrit, contactez-nous afin que nous puissions supprimer son compte.
            </p>

            <h2>9. Cookies (site web)</h2>
            <p>
              Notre site web utilise uniquement des cookies essentiels nécessaires au bon fonctionnement (session, préférences). Aucun cookie publicitaire ou de profilage n'est déposé.
            </p>

            <h2>10. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique. Les modifications majeures vous seront notifiées via l'application ou par e-mail. La date en haut de page reflète la dernière mise à jour.
            </p>

            <h2>11. Contact</h2>
            <p>
              Pour toute question relative à cette politique ou à vos données :<br />
              <strong>E-mail :</strong> <a href="mailto:nostresstogo@gmail.com">nostresstogo@gmail.com</a><br />
              <strong>WhatsApp :</strong> +1 319 777 4884<br />
              <strong>Adresse :</strong> Lomé, Togo
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
