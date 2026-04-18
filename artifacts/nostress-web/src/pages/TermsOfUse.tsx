import React from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">Conditions Générales d'Utilisation</h1>
          <p className="text-muted-foreground mb-12">Dernière mise à jour : 13 Avril 2026</p>

          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-li:text-muted-foreground">

            <h2>1. Acceptation des conditions</h2>
            <p>
              En téléchargeant, installant ou utilisant l'application mobile NoStress (ci-après « l'Application »), vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'Application.
            </p>
            <p>
              L'Application est opérée par <strong>NoStress</strong>, société domiciliée à Lomé, Togo (ci-après « Nous », « NoStress »).
            </p>

            <h2>2. Description du service</h2>
            <p>
              NoStress est une plateforme de découverte d'événements et de billetterie numérique destinée au marché togolais. Elle permet aux utilisateurs de :
            </p>
            <ul>
              <li>Découvrir des événements locaux (concerts, festivals, soirées, etc.).</li>
              <li>Acheter des billets électroniques via les solutions de paiement mobile intégrées.</li>
              <li>Consulter les lieux et établissements partenaires vérifiés.</li>
              <li>Gérer leurs billets et favoris depuis leur profil.</li>
            </ul>

            <h2>3. Inscription et compte utilisateur</h2>
            <p>
              Pour accéder à certaines fonctionnalités (achat de billets, favoris), vous devez créer un compte en fournissant des informations exactes, complètes et à jour. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte.
            </p>
            <p>
              Vous devez avoir au moins <strong>16 ans</strong> pour créer un compte NoStress. En vous inscrivant, vous certifiez répondre à cette exigence.
            </p>

            <h2>4. Comptes partenaires (structures)</h2>
            <p>
              Les organisateurs d'événements et établissements souhaitant s'inscrire en tant que partenaires doivent soumettre une demande via notre formulaire d'inscription. Toute inscription partenaire est soumise à une <strong>validation manuelle par l'équipe NoStress</strong> avant d'être visible sur l'Application.
            </p>
            <p>
              NoStress se réserve le droit d'approuver ou de rejeter toute demande sans justification obligatoire, ainsi que de suspendre ou supprimer un compte partenaire en cas de violation des présentes CGU.
            </p>
            <p>
              En vous inscrivant en tant que partenaire, vous vous engagez à :
            </p>
            <ul>
              <li>Fournir des informations exactes sur votre entreprise et vos événements.</li>
              <li>Honorer les billets vendus via la plateforme.</li>
              <li>Respecter la législation togolaise applicable à l'organisation d'événements.</li>
              <li>Ne pas publier de contenu offensant, trompeur ou illicite.</li>
            </ul>

            <h2>5. Achat de billets et paiements</h2>
            <p>
              Les achats de billets sont définitifs et non remboursables, sauf en cas d'annulation de l'événement par l'organisateur. En cas d'annulation, NoStress fera ses meilleurs efforts pour faciliter le remboursement selon les conditions de l'organisateur.
            </p>
            <p>
              Les transactions sont traitées via des partenaires de paiement mobile agréés au Togo. NoStress ne stocke pas les informations de paiement sur ses serveurs.
            </p>

            <h2>6. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de l'Application (textes, images, logos, icônes, code source) est la propriété exclusive de NoStress ou de ses partenaires. Toute reproduction ou utilisation sans autorisation écrite est strictement interdite.
            </p>
            <p>
              En publiant du contenu sur la plateforme (images d'événements, descriptions), les partenaires accordent à NoStress une licence non exclusive et gratuite pour utiliser ce contenu à des fins de promotion du service.
            </p>

            <h2>7. Données personnelles</h2>
            <p>
              La collecte et le traitement de vos données personnelles sont régis par notre <a href="/politique-confidentialite">Politique de Confidentialité</a>. En utilisant l'Application, vous consentez à ce traitement.
            </p>

            <h2>8. Contenu interdit</h2>
            <p>Il est strictement interdit d'utiliser NoStress pour :</p>
            <ul>
              <li>Publier des informations fausses ou trompeuses sur des événements.</li>
              <li>Vendre des billets sans autorisation de l'organisateur.</li>
              <li>Usurper l'identité d'une autre personne ou entité.</li>
              <li>Diffuser des contenus illicites, haineux ou contraires à la législation togolaise.</li>
              <li>Tenter de compromettre la sécurité ou le bon fonctionnement de la plateforme.</li>
            </ul>

            <h2>9. Limitation de responsabilité</h2>
            <p>
              NoStress agit en tant qu'intermédiaire entre les organisateurs d'événements et les utilisateurs. Nous ne saurions être tenus responsables des annulations, modifications ou problèmes liés à des événements organisés par des tiers, dans la limite permise par la loi togolaise.
            </p>
            <p>
              L'Application est fournie « en l'état ». Nous ne garantissons pas une disponibilité ininterrompue du service et ne pouvons être tenus responsables des dommages résultant d'une interruption temporaire.
            </p>

            <h2>10. Suspension et suppression de compte</h2>
            <p>
              NoStress se réserve le droit de suspendre ou de supprimer tout compte qui violerait les présentes CGU, sans préavis et sans compensation.
            </p>
            <p>
              Vous pouvez à tout moment demander la suppression de votre compte via la page <a href="/suppression-compte">Suppression de compte</a>. La suppression entraîne la perte définitive de toutes vos données, billets et favoris.
            </p>

            <h2>11. Modifications des CGU</h2>
            <p>
              NoStress se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur l'Application ou le site web. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.
            </p>

            <h2>12. Droit applicable et litiges</h2>
            <p>
              Les présentes CGU sont soumises au droit togolais. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents de Lomé, Togo, seront seuls compétents.
            </p>

            <h2>13. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU, veuillez nous contacter :
            </p>
            <ul>
              <li><strong>Email :</strong> legal@nostress.tg</li>
              <li><strong>Adresse :</strong> Lomé, Togo</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
