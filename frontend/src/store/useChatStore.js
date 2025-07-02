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
      toast.error("Failed to fetch users");
      console.error("Fetch users error:", err);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // 🔹 Fetch messages for a conversation
  getMessages: async (userId) => {
    if (!userId) return toast.error("No user selected");
    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error("Failed to fetch messages");
      console.error("Get messages error:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // 🔹 Send message
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser, socket } = useAuthStore.getState();

    if (!selectedUser || !authUser) return toast.error("No user selected");

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
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  },

  // 🔹 Delete message (and refresh or update)
  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      const updatedMessage = res.data;

      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? updatedMessage : m
        ),
      }));
    } catch (error) {
      toast.error("Failed to delete message");
      console.error("Delete message error:", error);
    }
  },

  // 🔹 Subscribe to socket events
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // ✅ New incoming message
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      if (newMessage.sender?._id !== selectedUser?._id) return;
      set({ messages: [...messages, newMessage] });
    });

    // ✅ Deleted message event
    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, deleted: true, text: null, image: null, video: null }
            : m
        ),
      }));
    });
  },

  // 🔹 Unsubscribe
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageDeleted");
  },

  // 🔹 Change selected user
  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
