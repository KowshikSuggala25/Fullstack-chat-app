import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Helper for choosing backend URL
const getSocketBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "https://fullstack-chat-app-pb32.onrender.com";
  }
  return "http://localhost:5000";
};

const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

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

      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        withCredentials: true,
      });
      const user = res.data?.user;

      if (!user || !user._id) {
        throw new Error("Invalid user data received from server");
      }

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
      await axios.post(`${API_BASE_URL}/auth/signup`, formData, {
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
      const res = await axios.get(`${API_BASE_URL}/auth/check`, { withCredentials: true });
      const user = res.data?.user;

      if (user && user._id) {
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
  updateProfile: async (fields) => {
    set({ isUpdatingProfile: true });
    try {
      // Clean input: remove empty/whitespace-only values
      const cleanedFields = {};
      for (const key in fields) {
        if (
          fields[key] !== undefined &&
          fields[key] !== null &&
          (typeof fields[key] !== "string" || fields[key].trim() !== "")
        ) {
          cleanedFields[key] = typeof fields[key] === "string" ? fields[key].trim() : fields[key];
        }
      }

      if (Object.keys(cleanedFields).length === 0) {
        throw new Error("No fields provided to update");
      }

      const res = await axios.put(
        `${API_BASE_URL}/auth/update-profile`,
        cleanedFields,
        { withCredentials: true }
      );

      set({ authUser: res.data, isUpdatingProfile: false });
      toast.success("Profile updated!");
      return res.data;
    } catch (err) {
      set({ isUpdatingProfile: false });
      const msg = err?.response?.data?.message || err.message || "Failed to update profile";
      toast.error(msg);
      throw err;
    }
  },

  // Logout
  logout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout error", err);
    }

    const socket = get().socket;
    socket?.disconnect();
    set({ authUser: null, socket: null, onlineUsers: [] });
  },
}));
