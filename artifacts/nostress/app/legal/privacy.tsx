import React from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp, useColors } from "@/context/AppContext";

export default function PrivacyScreen() {
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
          {isFr ? "Confidentialité" : "Privacy"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>
          {isFr ? "Politique de Confidentialité" : "Privacy Policy"}
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
    title: "1. Introduction",
    paragraphs: [
      "NoStress est une plateforme de découverte d'événements et de billetterie mobile opérée depuis Lomé, Togo, à destination des marchés togolais et béninois. La protection de vos données personnelles est une priorité absolue. Cette politique explique quelles données nous collectons, pourquoi, et vos droits sur celles-ci.",
    ],
  },
  {
    title: "2. Données que nous collectons",
    paragraphs: [],
    bullets: [
      "Compte : nom, adresse e-mail, mot de passe (haché avec bcrypt), numéro de téléphone (optionnel), pays (Togo ou Bénin).",
      "Vérification d'identité : code à 6 chiffres envoyé par e-mail pour valider votre adresse.",
      "Géolocalisation : uniquement avec votre consentement explicite, pour vous proposer les événements les plus proches.",
      "Activité : billets achetés, événements favoris, historique de connexion.",
      "Données partenaires : nom commercial, type d'activité, ville, description, site web, événements publiés.",
      "Techniques : jetons de session (JWT + refresh token), agent utilisateur, adresse IP (limitation de débit anti-abus).",
    ],
  },
  {
    title: "3. Utilisation des données",
    paragraphs: [],
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
    paragraphs: [
      "Nous ne vendons jamais vos données personnelles. Nous partageons uniquement le strict nécessaire avec :",
    ],
    bullets: [
      "Organisateurs d'événements : nom et référence du billet, pour validation à l'entrée.",
      "Prestataires de paiement mobile : uniquement les données nécessaires à la transaction. Nous ne stockons jamais vos codes PIN ni informations bancaires.",
      "Hébergeurs / stockage : OVH (hébergement applicatif), PostgreSQL (base de données), Google Cloud Storage (images d'événements).",
      "Notifications e-mail : serveur SMTP utilisé pour les codes de vérification et notifications de compte.",
      "Autorités légales : uniquement si la loi togolaise ou béninoise l'exige.",
    ],
  },
  {
    title: "5. Conservation des données",
    paragraphs: [],
    bullets: [
      "Compte actif : tant que vous utilisez le service.",
      "Compte supprimé : suppression définitive sous 30 jours après votre demande.",
      "Jetons de session révoqués : conservés 90 jours pour audit puis purgés.",
      "Logs de sécurité : 12 mois maximum.",
    ],
  },
  {
    title: "6. Sécurité",
    paragraphs: [],
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
      "Suppression : demander la suppression définitive de votre compte depuis l'écran « Compte ».",
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
    title: "10. Modifications",
    paragraphs: [
      "Nous pouvons mettre à jour cette politique. Les modifications majeures vous seront notifiées via l'application ou par e-mail. La date en haut de page reflète la dernière mise à jour.",
    ],
  },
];

const EN_SECTIONS = [
  {
    title: "1. Introduction",
    paragraphs: [
      "NoStress is a mobile event discovery and ticketing platform operated from Lomé, Togo, for the Togolese and Beninese markets. Protecting your personal data is an absolute priority. This policy explains what data we collect, why, and your rights regarding it.",
    ],
  },
  {
    title: "2. Data we collect",
    paragraphs: [],
    bullets: [
      "Account: name, email address, password (hashed with bcrypt), phone number (optional), country (Togo or Benin).",
      "Identity verification: 6-digit code sent by email to validate your address.",
      "Geolocation: only with your explicit consent, to suggest the closest events.",
      "Activity: tickets purchased, favorite events, login history.",
      "Partner data: business name, business type, city, description, website, published events.",
      "Technical: session tokens (JWT + refresh token), user agent, IP address (anti-abuse rate limiting).",
    ],
  },
  {
    title: "3. Use of data",
    paragraphs: [],
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
    paragraphs: [
      "We never sell your personal data. We share only what is strictly necessary with:",
    ],
    bullets: [
      "Event organizers: name and ticket reference, for validation at the entrance.",
      "Mobile payment providers: only the data needed for the transaction. We never store your PIN codes or banking information.",
      "Hosting / storage: OVH (application hosting), PostgreSQL (database), Google Cloud Storage (event images).",
      "Email notifications: SMTP server used for verification codes and account notifications.",
      "Legal authorities: only if Togolese or Beninese law requires it.",
    ],
  },
  {
    title: "5. Data retention",
    paragraphs: [],
    bullets: [
      "Active account: as long as you use the service.",
      "Deleted account: permanent deletion within 30 days of your request.",
      "Revoked session tokens: kept 90 days for audit, then purged.",
      "Security logs: 12 months maximum.",
    ],
  },
  {
    title: "6. Security",
    paragraphs: [],
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
      "Deletion: request permanent deletion of your account from the \"Account\" screen.",
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
    title: "10. Changes",
    paragraphs: [
      "We may update this policy. Major changes will be notified to you via the app or by email. The date at the top of the page reflects the last update.",
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
