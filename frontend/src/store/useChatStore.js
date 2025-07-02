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

  // 🔹 Fetch user list
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axios.get("/api/messages/users", { withCredentials: true });
      set({ users: res.data });
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn("Unauthorized: Please log in again.");
      } else {
        console.error("Failed to fetch users:", err);
      }
      toast.error("Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // 🔹 Fetch messages for a conversation
  getMessages: async (userId) => {
    if (!userId) {
      toast.error("No user selected");
      return;
    }

    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // 🔹 Send message (API + emit to socket)
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser, socket } = useAuthStore.getState();

    if (!selectedUser || !authUser) {
      toast.error("No user selected or not logged in");
      return;
    }

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;

      set({ messages: [...messages, savedMessage] });

      if (socket) {
        socket.emit("sendMessage", {
          receiverId: selectedUser._id,
          text: savedMessage.text,
          image: savedMessage.image,
          createdAt: savedMessage.createdAt,
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

  // 🔹 Delete a message (API call)
  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      const updatedMessage = res.data;

      // Locally mark as deleted
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? updatedMessage : m
        )
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  // 🔹 Listen for *new* and *deleted* messages via socket
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not initialized, cannot subscribe to messages.");
      return;
    }

    // New messages
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      if (!selectedUser) return;

      const isFromSelectedUser = newMessage.sender?._id === selectedUser._id;
      if (!isFromSelectedUser) return;

      set({ messages: [...messages, newMessage] });
    });

    // Deleted messages
    socket.on("messageDeleted", ({ messageId }) => {
      console.log("Received messageDeleted:", messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, deleted: true, text: null, image: null, video: null }
            : m
        )
      }));
    });
  },

  // 🔹 Unsubscribe from socket events
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeleted");
  },

  // 🔹 Change selected user
  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
