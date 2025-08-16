// backend/socket.js
import express from "express";
import http from "http";
import { Server } from "socket.io";

export const app = express();
export const server = http.createServer(app);

// Map userId -> socketId
const userSocketMap = {}; 

// Initialize Socket.io on server
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // frontend local
      "https://fullstack-chat-app-pb32.onrender.com", // deployed frontend
    ],
    credentials: true,
  },
});

// Helper to get receiver's socketId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Register user on connect
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`✅ User ${userId} online`);

    // send updated online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  // Handle incoming message
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }

    // echo back to sender for confirmation (sync frontend store)
    io.to(socket.id).emit("messageSent", { receiverId, message });
  });

  // Handle typing indicator
  socket.on("typing", ({ receiverId, isTyping }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId, isTyping });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      console.log(`✅ User ${userId} offline`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});
