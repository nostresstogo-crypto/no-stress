import { Router, type IRouter } from "express";

const router: IRouter = Router();

const cities = [
  { id: "abidjan", name: "Abidjan", country: "Côte d'Ivoire" },
  { id: "dakar", name: "Dakar", country: "Sénégal" },
  { id: "accra", name: "Accra", country: "Ghana" },
  { id: "lagos", name: "Lagos", country: "Nigeria" },
  { id: "lome", name: "Lomé", country: "Togo" },
  { id: "cotonou", name: "Cotonou", country: "Bénin" },
  { id: "ouagadougou", name: "Ouagadougou", country: "Burkina Faso" },
  { id: "bamako", name: "Bamako", country: "Mali" },
  { id: "nairobi", name: "Nairobi", country: "Kenya" },
  { id: "casablanca", name: "Casablanca", country: "Maroc" },
];

router.get("/cities", (_req, res) => {
  res.json({ cities });
});

export default router;
