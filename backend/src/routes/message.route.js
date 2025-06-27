import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendMessage, getMessages, getUsers } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsers);
router.get("/:id", getMessages);
router.post("/send/:id", sendMessage);

export default router;
