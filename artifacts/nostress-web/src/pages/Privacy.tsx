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
          <p className="text-muted-foreground mb-12">Dernière mise à jour : 1er Octobre 2023</p>

          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary">
            <h2>1. Introduction</h2>
            <p>
              Bienvenue sur NoStress, l'application de découverte d'événements opérée depuis Lomé, Togo. La protection de vos données personnelles est une priorité absolue pour nous. Cette politique de confidentialité explique comment nous collectons, utilisons, partageons et protégeons vos informations lorsque vous utilisez notre application mobile et nos services web.
            </p>

            <h2>2. Collecte des données</h2>
            <p>Nous collectons différents types d'informations pour améliorer votre expérience :</p>
            <ul>
              <li><strong>Données de compte :</strong> Nom, adresse e-mail, numéro de téléphone (utilisé pour les paiements mobiles).</li>
              <li><strong>Données de géolocalisation :</strong> Avec votre consentement, pour vous montrer les événements à proximité (Lomé, Kpalimé, Kara, etc.).</li>
              <li><strong>Données de transaction :</strong> Historique des billets achetés et événements favoris.</li>
            </ul>

            <h2>3. Utilisation des données</h2>
            <p>Vos informations sont utilisées pour :</p>
            <ul>
              <li>Vous fournir un accès aux événements et générer vos QR codes de billetterie.</li>
              <li>Traiter vos paiements de manière sécurisée via nos partenaires.</li>
              <li>Personnaliser vos recommandations de sorties.</li>
              <li>Vous envoyer des notifications importantes concernant les événements auxquels vous participez.</li>
            </ul>

            <h2>4. Partage des données</h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Cependant, nous pouvons partager certaines informations avec :
            </p>
            <ul>
              <li><strong>Organisateurs d'événements :</strong> Uniquement les informations nécessaires pour valider votre entrée (ex: nom sur le billet).</li>
              <li><strong>Prestataires de paiement :</strong> Pour le traitement sécurisé de vos achats.</li>
              <li><strong>Autorités légales :</strong> Si la loi togolaise l'exige.</li>
            </ul>

            <h2>5. Paiements mobiles</h2>
            <p>
              NoStress intègre des solutions de paiement mobile sécurisées pour faciliter l'achat de billets. Les transactions sont traitées par des opérateurs de confiance. Nous ne stockons pas vos codes PIN ou informations bancaires sensibles.
            </p>

            <h2>6. Droits des utilisateurs</h2>
            <p>Conformément aux réglementations en vigueur, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Accès et Rectification :</strong> Vous pouvez consulter et modifier vos données depuis l'application.</li>
              <li><strong>Suppression :</strong> Vous pouvez demander la suppression définitive de votre compte via notre <a href="/suppression-compte">page dédiée</a>.</li>
            </ul>

            <h2>7. Cookies et Technologies similaires</h2>
            <p>
              Notre site web utilise des cookies essentiels pour maintenir votre session de connexion et des cookies analytiques anonymisés pour comprendre comment notre site est utilisé, afin d'améliorer nos services.
            </p>

            <h2>8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles (chiffrement, accès restreints) pour protéger vos données contre l'accès non autorisé, la perte ou l'altération.
            </p>

            <h2>9. Modifications de la politique</h2>
            <p>
              Nous pouvons mettre à jour cette politique occasionnellement. Les modifications majeures vous seront notifiées via l'application ou par e-mail.
            </p>

            <h2>10. Coordonnées</h2>
            <p>
              Pour toute question concernant cette politique ou vos données personnelles, veuillez nous contacter :<br />
              <strong>Email :</strong> contact@nostress.tg<br />
              <strong>Adresse :</strong> Lomé, Togo
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
