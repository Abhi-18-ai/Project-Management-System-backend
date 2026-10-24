import { Router } from "express";

import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notification.controller.js";

import authenticate from "../middlewares/authenticate.js";

const router = Router();

router.get("/", authenticate, getMyNotifications);

router.patch("/read-all", authenticate, markAllNotificationsAsRead);

router.patch("/:notificationId/read", authenticate, markNotificationAsRead);

export default router;
