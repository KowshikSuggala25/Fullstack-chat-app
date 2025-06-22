import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set) => ({
  authUser: null,
  isLoggingIn: false,
  isSigningUp: false,
  isCheckingAuth: false,
  isUpdatingProfile: false,
  socket: null,

  login: async (formData) => {
    set({ isLoggingIn: true });

    if (!formData?.email || !formData?.password) {
      toast.error("Email and password are required");
      set({ isLoggingIn: false });
      return;
    }

    try {
      const res = await axios.post("/api/auth/login", formData);

      const user = res.data?.user;
      const token = res.data?.token;

      if (!user || !user._id || !token) {
        throw new Error("Invalid user or token received from server");
      }

      // Store token if you're using localStorage
      localStorage.setItem("token", token);

      // Establish socket connection
      const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
        query: { userId: user._id },
      });

      set({ authUser: user, isLoggingIn: false, socket });
      return user;
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.message || "Login failed");
      set({ isLoggingIn: false });
      throw err;
    }
  },

  signup: async (formData) => {
    set({ isSigningUp: true });

    try {
      const res = await axios.post("/api/auth/signup", formData, {
        withCredentials: true,
      });

      const user = res.data?.user;
      if (!user) throw new Error("Signup failed");

      set({ authUser: user, isSigningUp: false });
      return user;
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
      set({ isSigningUp: false });
      throw err;
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await axios.get("/api/auth/check", config);

      const user = res.data;
      set({ authUser: user, isCheckingAuth: false });

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
      toast.success("Profile updated");
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
      set({ isUpdatingProfile: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });

      set({ authUser: null, socket: null });
      localStorage.removeItem("token");
    } catch (err) {
      toast.error("Logout failed");
      throw err;
    }
  },
}));
