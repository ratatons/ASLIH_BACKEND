import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth.schema";
import { register, login, refresh, logout, me } from "../controllers/auth.controller";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", authLimiter, validate(refreshSchema), refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
