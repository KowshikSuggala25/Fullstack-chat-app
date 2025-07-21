import express from "express";
import { app, server } from "./lib/socket.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

// Load environment variables
console.log("Server process started. Loading config...");
dotenv.config();

const PORT = process.env.PORT || 5000;
console.log(`Attempting to start server on PORT: ${PORT}`);

// Required to use __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
console.log("Applying body parsers...");
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://fullstack-chat-app-pb32.onrender.com"],
    credentials: true,
  })
);
console.log("CORS applied.");

// Mount routes
console.log("Mounting routes...");
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
console.log("Routes mounted.");

// Serve Vite frontend build in production
if (process.env.NODE_ENV === "production") {
  console.log("Serving Vite frontend...");
  app.use(express.static(path.join(__dirname, "..", "..", "frontend", "dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "dist", "index.html"));
  });
}

// Start server and connect DB
server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
  connectDB();
});
