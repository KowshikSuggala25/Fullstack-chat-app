import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Used to store online users: { userId: socketId }
const userSocketMap = {};

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // ✅ update with frontend domain in production
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Expose socket ID lookup
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log("User ID registered:", userId);
  }

  // Notify all clients of updated online user list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("🔴 A user disconnected:", socket.id);

    // Remove user from the map
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }

    // Notify all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
