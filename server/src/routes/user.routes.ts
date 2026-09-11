import { Router } from "express";
import {
  getUserHandler,
  listUsersHandler,
  patchUserActiveHandler,
  patchUserHandler,
  patchUserPasswordHandler,
  postUserHandler,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const userRouter = Router();

userRouter.use(requireAuth, requireRole("ADMIN"));

userRouter.get("/", listUsersHandler);
userRouter.post("/", postUserHandler);
userRouter.get("/:id", getUserHandler);
userRouter.patch("/:id", patchUserHandler);
userRouter.patch("/:id/active", patchUserActiveHandler);
userRouter.patch("/:id/password", patchUserPasswordHandler);