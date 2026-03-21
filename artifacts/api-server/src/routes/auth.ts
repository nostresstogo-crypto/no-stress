import { Router, type IRouter } from "express";

const router: IRouter = Router();

const users: any[] = [];

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  let user = users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: `u_${Date.now()}`,
      email,
      name: email.split("@")[0],
      role: email.includes("admin") ? "admin" : "user",
      favorites: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }
  const token = `mock_token_${Date.now()}`;
  res.json({ token, user });
});

router.post("/auth/register", (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }
  const user = {
    id: `u_${Date.now()}`,
    email,
    name,
    phone,
    role: "user",
    favorites: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  const token = `mock_token_${Date.now()}`;
  res.status(201).json({ token, user });
});

export default router;
