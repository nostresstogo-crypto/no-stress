import React from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp, useColors } from "@/context/AppContext";

export default function TermsScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const isFr = lang === "fr";

  const styles = makeStyles(C);

  const sections = isFr ? FR_SECTIONS : EN_SECTIONS;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isFr ? "Conditions Générales" : "Terms of Use"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>
          {isFr ? "Conditions Générales d'Utilisation" : "Terms of Use"}
        </Text>
        <Text style={styles.updated}>
          {isFr ? "Dernière mise à jour : 20 avril 2026" : "Last updated: April 20, 2026"}
        </Text>

        {sections.map((s, i) => (
          <View key={i} style={{ marginBottom: 18 }}>
            <Text style={styles.h2}>{s.title}</Text>
            {s.paragraphs.map((p, j) => (
              <Text key={j} style={styles.p}>{p}</Text>
            ))}
            {s.bullets && s.bullets.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{isFr ? "Contact" : "Contact"}</Text>
          <TouchableOpacity onPress={() => Linking.openURL("mailto:nostresstogo@gmail.com")}>
            <Text style={styles.contactLink}>nostresstogo@gmail.com</Text>
          </TouchableOpacity>
          <Text style={styles.contactMeta}>WhatsApp : +1 319 777 4884</Text>
          <Text style={styles.contactMeta}>{isFr ? "Adresse : Lomé, Togo" : "Address: Lomé, Togo"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const FR_SECTIONS = [
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
      "Aux organisateurs de publier et gérer leurs événements après validation.",
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
      "Fournir des informations exactes sur votre entreprise et vos événements.",
      "Honorer les billets vendus via la plateforme.",
      "Respecter la législation applicable à l'organisation d'événements.",
      "Ne pas publier de contenu offensant, trompeur ou illicite.",
    ],
  },
  {
    title: "5. Achat de billets et paiements",
    paragraphs: [
      "Les achats de billets sont définitifs et non remboursables, sauf en cas d'annulation de l'événement par l'organisateur. En cas d'annulation, NoStress facilite le remboursement selon les conditions de l'organisateur.",
      "Les transactions sont traitées via des partenaires de paiement mobile agréés. NoStress ne stocke pas les informations de paiement sur ses serveurs.",
    ],
  },
  {
    title: "6. Propriété intellectuelle",
    paragraphs: [
      "L'ensemble du contenu de l'Application (textes, images, logos, icônes, code source) est la propriété exclusive de NoStress ou de ses partenaires. Toute reproduction sans autorisation écrite est interdite.",
      "En publiant du contenu (images, descriptions d'événements), les partenaires accordent à NoStress une licence non exclusive et gratuite pour utiliser ce contenu à des fins de promotion du service.",
    ],
  },
  {
    title: "7. Données personnelles",
    paragraphs: [
      "La collecte et le traitement de vos données sont régis par notre Politique de Confidentialité, accessible depuis l'écran d'inscription. En utilisant le service, vous consentez à ce traitement.",
    ],
  },
  {
    title: "8. Contenu interdit",
    paragraphs: ["Il est strictement interdit d'utiliser NoStress pour :"],
    bullets: [
      "Publier des informations fausses ou trompeuses sur des événements.",
      "Vendre des billets sans autorisation de l'organisateur.",
      "Usurper l'identité d'une autre personne ou entité.",
      "Diffuser des contenus illicites, haineux, discriminatoires ou contraires à la loi.",
      "Tenter de compromettre la sécurité ou le fonctionnement de la plateforme.",
      "Contourner les mécanismes de vérification d'adresse e-mail ou de limitation de débit.",
    ],
  },
  {
    title: "9. Limitation de responsabilité",
    paragraphs: [
      "NoStress agit en tant qu'intermédiaire entre les organisateurs et les utilisateurs. Nous ne pouvons être tenus responsables des annulations, modifications ou problèmes liés à des événements organisés par des tiers, dans la limite permise par la loi.",
      "L'Application est fournie « en l'état ». Nous ne garantissons pas une disponibilité ininterrompue et ne pouvons être tenus responsables des dommages résultant d'une interruption temporaire.",
    ],
  },
  {
    title: "10. Suspension et suppression de compte",
    paragraphs: [
      "NoStress peut suspendre ou supprimer tout compte qui violerait les CGU, sans préavis et sans compensation.",
      "Vous pouvez à tout moment demander la suppression de votre compte depuis l'écran « Compte » ou par e-mail. La suppression est définitive et entraîne la perte de toutes vos données, billets et favoris.",
    ],
  },
  {
    title: "11. Modifications des CGU",
    paragraphs: [
      "NoStress peut modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.",
    ],
  },
  {
    title: "12. Droit applicable et litiges",
    paragraphs: [
      "Les présentes CGU sont soumises au droit togolais. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents de Lomé, Togo, seront seuls compétents.",
    ],
  },
];

const EN_SECTIONS = [
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
      "Allow organizers to publish and manage their events after validation.",
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
      "Provide accurate information about your business and events.",
      "Honor tickets sold through the platform.",
      "Comply with the laws applicable to event organization.",
      "Not publish offensive, misleading, or unlawful content.",
    ],
  },
  {
    title: "5. Ticket purchases and payments",
    paragraphs: [
      "Ticket purchases are final and non-refundable, except in case of event cancellation by the organizer. In case of cancellation, NoStress facilitates refunds according to the organizer's terms.",
      "Transactions are processed via licensed mobile payment partners. NoStress does not store payment information on its servers.",
    ],
  },
  {
    title: "6. Intellectual property",
    paragraphs: [
      "All content in the App (texts, images, logos, icons, source code) is the exclusive property of NoStress or its partners. Any reproduction without written authorization is prohibited.",
      "By publishing content (images, event descriptions), partners grant NoStress a non-exclusive, royalty-free license to use this content for the purpose of promoting the service.",
    ],
  },
  {
    title: "7. Personal data",
    paragraphs: [
      "The collection and processing of your data is governed by our Privacy Policy, accessible from the registration screen. By using the service, you consent to this processing.",
    ],
  },
  {
    title: "8. Prohibited content",
    paragraphs: ["It is strictly forbidden to use NoStress to:"],
    bullets: [
      "Publish false or misleading information about events.",
      "Sell tickets without the organizer's authorization.",
      "Impersonate another person or entity.",
      "Distribute unlawful, hateful, discriminatory or illegal content.",
      "Attempt to compromise the security or operation of the platform.",
      "Bypass email verification or rate-limiting mechanisms.",
    ],
  },
  {
    title: "9. Limitation of liability",
    paragraphs: [
      "NoStress acts as an intermediary between organizers and users. We cannot be held liable for cancellations, changes, or issues related to events organized by third parties, to the extent permitted by law.",
      "The App is provided \"as is\". We do not guarantee uninterrupted availability and cannot be held liable for damages resulting from a temporary interruption.",
    ],
  },
  {
    title: "10. Account suspension and deletion",
    paragraphs: [
      "NoStress may suspend or delete any account that violates the Terms, without notice and without compensation.",
      "You may request deletion of your account at any time from the \"Account\" screen or by email. Deletion is permanent and results in the loss of all your data, tickets, and favorites.",
    ],
  },
  {
    title: "11. Changes to the Terms",
    paragraphs: [
      "NoStress may modify these Terms at any time. Changes take effect upon publication. Continued use of the service after modification constitutes acceptance of the new terms.",
    ],
  },
  {
    title: "12. Applicable law and disputes",
    paragraphs: [
      "These Terms are governed by Togolese law. In case of dispute, the parties undertake to seek an amicable solution. Failing this, the competent courts of Lomé, Togo, shall have sole jurisdiction.",
    ],
  },
];

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  h1: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
    marginTop: 8,
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 20,
    fontFamily: "Inter_400Regular",
  },
  h2: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginTop: 12,
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 4,
    marginBottom: 6,
  },
  bulletDot: {
    width: 16,
    color: C.lavender,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
    fontFamily: "Inter_400Regular",
  },
  contactCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 10,
  },
  contactLink: {
    fontSize: 14,
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  contactMeta: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
});
