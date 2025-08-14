import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import multer from "multer";

console.log('message.route.js loaded ✅'); // Log for debugging

const router = express.Router();

// Multer middleware — handles form-data (text, base64 media, or file if needed)
const storage = multer.memoryStorage(); // Store the file in memory as a buffer
const upload = multer({ storage: storage });

// Routes
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, upload.any(), sendMessage);  // Handles emoji, GIFs, base64 image/video

router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id", protectRoute, deleteMessage);

export default router;
