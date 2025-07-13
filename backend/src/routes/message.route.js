import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import { deleteMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.delete("/messages/:id", protectRoute, deleteMessage);
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.get("/messages/:id", protectRoute, getMessages);

export default router;
