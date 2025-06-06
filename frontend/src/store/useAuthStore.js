import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set) => ({
  authUser: null,
  isLoggingIn: false,
  isSigningUp: false,
  isUpdatingProfile: false,
  onlineUsers: [], // <-- add this line
  socket: null,
  login: async (formData) => {
    set({ isLoggingIn: true });
    // Defensive check for required fields
    if (!formData || !formData.email || !formData.password) {
      set({ isLoggingIn: false });
      toast.error("Email and password are required");
      return;
    }
    try {
      const res = await axios.post("/api/auth/login", formData);

      const user = res.data?.user;
      if (!user || !user._id) {
        throw new Error("Invalid user data received from server");
      }
      const socket = io("http://localhost:5000", {
        query: { userId: user._id },
      });
      set({ authUser: user, isLoggingIn: false, socket });
      return user;
    } catch (err) {
      set({ isLoggingIn: false });
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Login failed";
      toast.error(errorMsg);
      console.error("Login error:", err);
      throw err;
    }
  },
  signup: async (formData) => {
    set({ isSigningUp: true });
    try {
      const res = await axios.post(
        "/api/auth/signup",
        formData,
        { withCredentials: true }
      );
      set({ authUser: res.data.user, isSigningUp: false });
      return res.data.user;
    } catch (err) {
      set({ isSigningUp: false });
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Signup failed";
      toast.error(errorMsg);
      throw err;
    }
  },
  checkAuth: async () => {
    try {
      const res = await axios.get("/api/auth/check", { withCredentials: true });
      set({ authUser: res.data.user }); // Make sure your backend returns { user: ... }
      return res.data.user;
    } catch (err) {
      set({ authUser: null });
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
  // ...other actions
}));
export const useOnlineUsersStore = create((set) => ({
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (user) => set((state) => ({
    onlineUsers: [...state.onlineUsers, user]
  })),
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(user => user._id !== userId)
  }))
}));
