import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Helper for choosing backend URL
const getSocketBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "https://fullstack-chat-app-pb32.onrender.com"; // relative path on Render
  }
  return "http://localhost:5000";
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isLoggingIn: false,
  isSigningUp: false,
  isCheckingAuth: false,
  isUpdatingProfile: false,
  socket: null,
  onlineUsers: [],

  // Login handler
  login: async (formData) => {
    set({ isLoggingIn: true });
    try {
      if (!formData?.email || !formData?.password) {
        throw new Error("Email and password are required");
      }

      const res = await axios.post("/api/auth/login", formData, {
        withCredentials: true,
      });
      const user = res.data?.user;

      if (!user || !user._id) {
        throw new Error("Invalid user data received from server");
      }

      // Create socket connection
      const socket = io(getSocketBaseUrl(), {
        query: { userId: user._id },
        withCredentials: true,
        transports: ["websocket"],
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        toast.error("WebSocket connection failed: " + err.message);
      });

      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });

      socket.on("newMessage", (message) => {
        console.log("Received newMessage", message);
        // Optionally handle message here
      });

      set({ authUser: user, isLoggingIn: false, socket });
      return user;
    } catch (err) {
      set({ isLoggingIn: false });
      toast.error(err?.response?.data?.message || err.message || "Login failed");
      throw err;
    }
  },

  // Signup handler
  signup: async (formData) => {
    set({ isSigningUp: true });
    try {
      await axios.post("/api/auth/signup", formData, {
        withCredentials: true,
      });
      toast.success("Signup successful! Please log in.");
      set({ isSigningUp: false });
    } catch (err) {
      set({ isSigningUp: false });
      toast.error(err?.response?.data?.message || err.message || "Signup failed");
      throw err;
    }
  },

  // Check existing auth
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axios.get("/api/auth/check", { withCredentials: true });
      const user = res.data?.user;

      if (user && user._id) {
        // Reconnect socket
        const socket = io(getSocketBaseUrl(), {
          query: { userId: user._id },
          withCredentials: true,
          transports: ["websocket"],
        });

        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          toast.error("WebSocket connection failed: " + err.message);
        });

        socket.on("getOnlineUsers", (users) => {
          set({ onlineUsers: users });
        });

        socket.on("newMessage", (message) => {
          console.log("Received newMessage", message);
        });

        set({ authUser: user, socket, isCheckingAuth: false });
      } else {
        set({ authUser: null, isCheckingAuth: false });
      }
      return user;
    } catch (err) {
      set({ authUser: null, isCheckingAuth: false });
      return null;
    }
  },

  // Profile update
  updateProfile: async ({ profilePic }) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axios.put(
        "/api/auth/update-profile",
        { profilePic },
        { withCredentials: true }
      );
      set({ authUser: res.data, isUpdatingProfile: false });
      toast.success("Profile updated!");
      return res.data;
    } catch (err) {
      set({ isUpdatingProfile: false });
      toast.error(err?.response?.data?.message || "Failed to update profile");
      throw err;
    }
  },

  // Logout
  logout: async () => {
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout error", err);
    }

    const socket = get().socket;
    socket?.disconnect();
    set({ authUser: null, socket: null, onlineUsers: [] });
  },
}));
