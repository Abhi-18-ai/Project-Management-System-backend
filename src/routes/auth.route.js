import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/me", authenticate, getMe);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAllDevices);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token",resetPassword)

export default router;
