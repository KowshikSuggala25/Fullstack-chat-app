import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import { checkAuth, login, logout, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

dotenv.config();

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

// ✅ PROFILE UPDATE ROUTE
router.put("/update-profile", protectRoute, async (req, res) => {
  console.log("🟡 [update-profile] Request body:", req.body);

  try {
    const { fullName, email, profilePic } = req.body;
    const updateFields = {};

    if (typeof fullName === "string" && fullName.trim() !== "") {
      updateFields.fullName = fullName.trim();
    }

    if (typeof email === "string" && email.trim() !== "") {
      updateFields.email = email.trim();
    }

    if (
      typeof profilePic === "string" &&
      profilePic.startsWith("data:image")
    ) {
      updateFields.profilePic = profilePic;
    }

    if (Object.keys(updateFields).length === 0) {
      console.warn("⚠️ [update-profile] No valid fields provided to update");
      return res.status(400).json({ message: "No valid fields to update" });
    }

    console.log("✅ [update-profile] Updating fields:", updateFields);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      console.error("❌ User not found for update:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ [update-profile] Update successful:", updatedUser);
    res.json(updatedUser);
  } catch (err) {
    console.error("❌ [update-profile] Error:", err);
    res.status(500).json({ message: "Profile update failed", error: err.message });
  }
});

export default router;
