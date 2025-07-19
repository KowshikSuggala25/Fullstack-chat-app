import { create } from "zustand";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { axios } from "../lib/axios";

const getSocketBaseUrl = () => {
  if (import.meta.env.MODE === "development") {
    return "http://localhost:5000";
  }
  return "https://fullstack-chat-app-pb32.onrender.com";
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
    try {
      const res = await axiosInstance.post("/auth/login", formData);
      const user = res.data?.user;

      if (!user || !user._id) throw new Error("Invalid user data received");

      const socket = io(getSocketBaseUrl(), {
        query: { userId: user._id },
        transports: ["websocket"],
        withCredentials: true,
      });

      socket.on("connect_error", (err) => {
        toast.error("Socket connection failed: " + err.message);
      });

      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });

      socket.on("newMessage", (message) => {
        console.log("Received new message:", message);
      });

      set({ authUser: user, isLoggingIn: false, socket });
      return user;
    } catch (err) {
      set({ isLoggingIn: false });
      toast.error(err?.response?.data?.message || err.message || "Login failed");
      throw err;
    }
  },

  signup: async (formData) => {
    set({ isSigningUp: true });
    try {
      await axiosInstance.post("/auth/signup", formData);
      toast.success("Signup successful! Please log in.");
      set({ isSigningUp: false });
    } catch (err) {
      set({ isSigningUp: false });
      toast.error(err?.response?.data?.message || err.message || "Signup failed");
      throw err;
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");
      const user = res.data?.user;

      if (user && user._id) {
        const socket = io(getSocketBaseUrl(), {
          query: { userId: user._id },
          transports: ["websocket"],
          withCredentials: true,
        });

        socket.on("connect_error", (err) => {
          toast.error("Socket connection failed: " + err.message);
        });

        socket.on("getOnlineUsers", (users) => {
          set({ onlineUsers: users });
        });

        socket.on("newMessage", (message) => {
          console.log("Received new message:", message);
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

  updateProfile: async (fields) => {
    set({ isUpdatingProfile: true });
    try {
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

      const res = await axiosInstance.put("/auth/update-profile", cleanedFields);
      set({ authUser: res.data, isUpdatingProfile: false });
      toast.success("Profile updated!");
      return res.data;
    } catch (err) {
      set({ isUpdatingProfile: false });
      toast.error(err?.response?.data?.message || err.message || "Failed to update profile");
      throw err;
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error("Logout error", err);
    }

    const socket = get().socket;
    socket?.disconnect();
    set({ authUser: null, socket: null, onlineUsers: [] });
  },
}));
