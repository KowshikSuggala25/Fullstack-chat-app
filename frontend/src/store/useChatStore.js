import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import axios from "axios";

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  isSidebarOpen: true,
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

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

  // Optimistic send message
  sendMessage: async (messageData, { type = "text", mediaUrl = null, sticker = null, gif = null } = {}) => {
    const { selectedUser, messages } = get();
    const { authUser, socket } = useAuthStore.getState();
    if (!selectedUser || !authUser) return toast.error("No user selected");

    // Create a temporary message for instant UI feedback
    const tempId = generateTempId();
    const tempMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || null,
      image: type === "image" ? mediaUrl : null,
      video: type === "video" ? mediaUrl : null,
      sticker: sticker || null,
      gif: gif || null,
      createdAt: new Date().toISOString(),
      deleted: false,
      reactions: [],
      sender: {
        _id: authUser._id,
        profilePic: authUser.profilePic,
        name: authUser.name,
      },
    };
    set({ messages: [...messages, tempMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;
      set((state) => ({
        messages: state.messages.map((m) => (m._id === tempId ? savedMessage : m)),
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  },

  // Optimistic delete message
  deleteMessage: async (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId
          ? { ...m, deleted: true, text: null, image: null, video: null, sticker: null, gif: null }
          : m
      ),
    }));
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
    } catch (error) {
      toast.error("Failed to delete message");
      console.error("Delete message error:", error);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // New incoming message
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      // Only add if the message is for the current chat
      if (
        (newMessage.senderId === selectedUser?._id || newMessage.receiverId === selectedUser?._id)
      ) {
        set((state) => {
          // Remove any temp message with same text/media
          const filtered = state.messages.filter(
            (m) =>
              !(
                m._id.startsWith("temp-") &&
                ((m.text && m.text === newMessage.text) ||
                  (m.image && m.image === newMessage.image) ||
                  (m.video && m.video === newMessage.video) ||
                  (m.sticker && m.sticker === newMessage.sticker) ||
                  (m.gif && m.gif === newMessage.gif))
              )
          );
          return { messages: [...filtered, newMessage] };
        });
      }
    });

    // Deleted message event
    socket.on("messageDeleted", ({ messageId, message }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, ...message }
            : m
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageDeleted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
