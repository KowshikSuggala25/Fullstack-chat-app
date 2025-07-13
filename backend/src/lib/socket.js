import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";

export const app = express();
export const server = http.createServer(app);

// Apply middleware
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://fullstack-chat-app-pb32.onrender.com"
  ],
  credentials: true,
}));

// Socket.io
const userSocketMap = {};
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://fullstack-chat-app-pb32.onrender.com"
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("sendMessage", ({ receiverId, text, image, sender }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        sender,
        text,
        image,
        createdAt: new Date(),
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io };
