import express from "express";


const router = express.Router();

router.get("/healthcheck", (req, res) => {
  res.status(200).json({ status: "success", message: "API is working properly for Project Management System" });
});

export default router;
