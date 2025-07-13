import express from "express";
import { app, server } from "./lib/socket.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

dotenv.config();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// ✅ Add this line! Express is needed to use express.json:
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://fullstack-chat-app-pb32.onrender.com"
  ],
  credentials: true,
}));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  connectDB();
});
