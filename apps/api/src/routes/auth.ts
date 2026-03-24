import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const {
      email, password, name,
      business_name, gstin, state_code
    } = req.body;

    if (!email || !password || !name || !business_name || !gstin) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 12);
    let bizId: string;
    let userId: string;

    await db.transaction(async (client) => {
      const { rows: [biz] } = await client.query(
        `INSERT INTO businesses (name, gstin, address)
         VALUES ($1, $2, $3) RETURNING id`,
        [
          business_name,
          gstin.toUpperCase(),
          JSON.stringify({ state_code: state_code || "29" }),
        ]
      );
      bizId = biz.id;

      const { rows: [user] } = await client.query(
        `INSERT INTO users
         (business_id, email, password_hash, name, role)
         VALUES ($1,$2,$3,$4,'admin') RETURNING id`,
        [biz.id, email.toLowerCase(), hash, name]
      );
      userId = user.id;
    });

    res.status(201).json({ message: "Account created. Please log in." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows: [user] } = await db.query(
      `SELECT u.*, b.name as business_name
       FROM users u
       JOIN businesses b ON u.business_id = b.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email?.toLowerCase()]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        businessId: user.business_id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "30d" }
    );

    await db.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = $1",
      [user.id]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_name: user.business_name,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const payload = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET!
    ) as any;

    const { rows: [user] } = await db.query(
      "SELECT * FROM users WHERE id = $1 AND is_active = true",
      [payload.userId]
    );
    if (!user) return res.status(401).json({ error: "User not found" });

    const accessToken = jwt.sign(
      {
        userId: user.id,
        businessId: user.business_id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({ access_token: accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { rows: [user] } = await db.query(
      `SELECT u.id, u.name, u.email, u.role,
              b.id as business_id, b.name as business_name,
              b.gstin, b.address, b.bank_details, b.plan
       FROM users u
       JOIN businesses b ON u.business_id = b.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;