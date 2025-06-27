import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Helper to choose correct backend URL
const getSocketBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "/"; // same origin on Render
  } else {
    return "http://localhost:5000";
  }
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isLoggingIn: false,
  isSigningUp: false,
  isCheckingAuth: false,
  isUpdatingProfile: false,
  socket: null,
  onlineUsers: [],

  login: async (formData) => {
    set({ isLoggingIn: true });

    if (!formData?.email || !formData?.password) {
      set({ isLoggingIn: false });
      toast.error("Email and password are required");
      return;
    }

    try {
      const res = await axios.post("/api/auth/login", formData, {
        withCredentials: true,
      });
      const user = res.data?.user;

      if (!user || !user._id) {
        throw new Error("Invalid user data received from server");
      }

      // Initialize socket connection
      const socket = io(getSocketBaseUrl(), {
        query: { userId: user._id },
        withCredentials: true,
      });

      // Listen for online users broadcast
      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });

      // Example: Listen for newMessage event (for chat)
      socket.on("newMessage", (message) => {
        // Optionally you can store messages here
        console.log("Received newMessage", message);
      });

      set({ authUser: user, isLoggingIn: false, socket });
      return user;
    } catch (err) {
      set({ isLoggingIn: false });
      const errorMsg = err.response?.data?.message || err.message || "Login failed";
      toast.error(errorMsg);
      throw err;
    }
  },

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
    const errorMsg = err.response?.data?.message || err.message || "Signup failed";
    toast.error(errorMsg);
    throw err;
  }
},

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axios.get("/api/auth/check", { withCredentials: true });
      const user = res.data.user;
      if (user && user._id) {
        // Reconnect socket if user already logged in
        const socket = io(getSocketBaseUrl(), {
          query: { userId: user._id },
          withCredentials: true,
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
      toast.error(err.response?.data?.message || "Failed to update profile");
      throw err;
    }
  },

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

