// server/routes/message.route.js
import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import multer from "multer"; // <-- Import multer

console.log('message.route.js loaded.'); // <-- ADD THIS
const router = express.Router();

// Initialize multer to handle form data (but no actual files for now, as image/video are base64 strings in req.body)
const upload = multer(); // <-- Create a multer instance

router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, upload.any(), sendMessage); // <-- ADDED upload.any()

export default router;