import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import { deleteMessage } from "../controllers/messageController.js";

const router = express.Router();

router.delete("/messages/:id", protect, deleteMessage);
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

export default router;
