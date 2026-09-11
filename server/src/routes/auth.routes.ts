import { Router } from "express";
import { getMe, postLogin, postLogout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/me", requireAuth, getMe);
