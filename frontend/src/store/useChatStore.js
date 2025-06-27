import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import axios from "axios";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axios.get("/api/messages/users", { withCredentials: true });
      return res.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.warn("Unauthorized: Please log in again.");
      } else {
        console.error("Failed to fetch users:", err);
      }
      return null;
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser, socket } = useAuthStore.getState();
    if (!selectedUser || !authUser) {
      toast.error("No user selected or not logged in");
      return;
    }

    try {
      // 1️⃣ Save to DB
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;
      set({ messages: [...messages, savedMessage] });

      // 2️⃣ Emit via Socket for Real-Time
      if (socket) {
        socket.emit("sendMessage", {
          receiverId: selectedUser._id,
          text: savedMessage.text,
          image: savedMessage.image,
          sender: {
            _id: authUser._id,
            profilePic: authUser.profilePic,
            name: authUser.name,
          },
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not initialized, cannot subscribe to messages.");
      return;
    }

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      if (!selectedUser) return;

      // Match on newMessage.sender._id
      const isFromSelectedUser = newMessage.sender?._id === selectedUser._id;
      if (!isFromSelectedUser) return;

      set({ messages: [...messages, newMessage] });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
