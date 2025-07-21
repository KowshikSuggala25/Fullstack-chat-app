import express from "express";
import { app, server } from "./lib/socket.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; // Keep this one
import cors from "cors"; // Keep this one
import path from "path";
import { fileURLToPath } from "url";
// Removed duplicate: import cors from "cors";
// Removed duplicate: import cookieParser from "cookie-parser";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

console.log('Server process started. Loading config...'); 
dotenv.config();
const PORT = process.env.PORT || 5000;
console.log(`Attempting to start server on PORT: ${PORT}`);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
console.log('Applying body parsers...');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
console.log('Body parsers and cookieParser applied.');

app.use(cors({
    origin: ['http://localhost:5173', 'https://fullstack-chat-app-pb32.onrender.com'],
    credentials: true,
}));
console.log('CORS applied.');

// Mount your routes
console.log('Mounting routes...');
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
console.log('Routes mounted.');

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
    console.log(`Server is running on PORT:${PORT}`);
    connectDB();
});
