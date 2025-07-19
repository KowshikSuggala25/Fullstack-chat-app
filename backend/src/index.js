import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

console.log('Server process started. Loading config...'); 
dotenv.config();

const PORT = process.env.PORT || 5000;
console.log(`Attempting to start server on PORT: ${PORT}`);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
console.log('Applying body parsers...'); // <-- ADD THIS
// INCREASE THE LIMIT FOR JSON AND URL-ENCODED BODIES
// This is crucial for handling large Base64 strings
app.use(express.json({ limit: '50mb' })); // Allows JSON request bodies up to 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Allows URL-encoded request bodies up to 50MB
app.use(cookieParser());
console.log('Body parsers and cookieParser applied.'); // <-- ADD THIS

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
console.log('CORS applied.'); // <-- ADD THIS

// Mount your routes
console.log('Mounting routes...'); // <-- ADD THIS
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
console.log('Routes mounted.'); // <-- ADD THIS

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on PORT:${PORT}`);
    connectDB();
});