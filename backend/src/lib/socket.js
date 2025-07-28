import express from "express";
import http from "http";
import { Server } from "socket.io";

export const app = express();
export const server = http.createServer(app);

// Map userId -> socketId
const userSocketMap = {};

// Helper to get receiver's socketId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Initialize Socket.io on server
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://fullstack-chat-app-pb32.onrender.com"
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Register user on connect
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`✅ User ${userId} online`);
  }

  // Notify all clients of updated online user list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle incoming message
  socket.on("sendMessage", ({ receiverId, message }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
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
