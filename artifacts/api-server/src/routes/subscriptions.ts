import { Router, type IRouter } from "express";

const router: IRouter = Router();

const plans = [
  {
    id: "free",
    name: "Free",
    nameFr: "Gratuit",
    monthlyPriceFCFA: 0,
    features: ["1 active event", "Basic analytics", "Standard listing"],
    featuresFr: ["1 événement actif", "Analyses de base", "Listing standard"],
    isPopular: false,
  },
  {
    id: "pro",
    name: "Pro",
    nameFr: "Pro",
    monthlyPriceFCFA: 15000,
    features: ["10 active events", "Advanced analytics", "Featured listing", "Priority support", "Mobile money payments"],
    featuresFr: ["10 événements actifs", "Analyses avancées", "Listing mis en avant", "Support prioritaire", "Paiements mobile money"],
    isPopular: true,
  },
  {
    id: "premium",
    name: "Premium",
    nameFr: "Premium",
    monthlyPriceFCFA: 45000,
    features: ["Unlimited events", "Full analytics suite", "Dedicated account manager", "Custom branding", "API access"],
    featuresFr: ["Événements illimités", "Suite d'analyses complète", "Account manager dédié", "Branding personnalisé", "Accès API"],
    isPopular: false,
  },
];

router.get("/subscriptions", (_req, res) => {
  res.json({ plans });
});

export default router;
