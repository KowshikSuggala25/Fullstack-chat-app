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
  sendingMessages: new Set(),
  deletingMessages: new Set(),

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

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser, socket } = useAuthStore.getState();

    if (!selectedUser || !authUser) return toast.error("No user selected");

    // ✅ FINAL FIX: Revert the optimistic message to a simple structure.
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      senderId: authUser._id, // Use a simple string, not an object
      receiverId: selectedUser._id, // Use a simple string
      text: messageData.text || null,
      image: messageData.image || null,
      video: messageData.video || null,
      sticker: messageData.sticker || null,
      gif: messageData.gif || null,
      createdAt: new Date().toISOString(),
      reactions: [],
      deleted: false,
      isOptimistic: true,
      isSending: true,
    };

    set(state => {
      const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
      newSendingMessages.add(optimisticMessage._id);
      return {
        messages: [...state.messages, optimisticMessage],
        sendingMessages: newSendingMessages,
      };
    });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;

      set(state => {
        const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
        newSendingMessages.delete(optimisticMessage._id);
        return {
          messages: state.messages.map(msg =>
            msg._id === optimisticMessage._id ? savedMessage : msg
          ),
          sendingMessages: newSendingMessages,
        };
      });

      if (socket) {
        socket.emit("sendMessage", {
          receiverId: selectedUser._id,
          message: savedMessage
        });
      }

    } catch (error) {
      set(state => {
        const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
        newSendingMessages.delete(optimisticMessage._id);
        return {
          messages: state.messages.filter(msg => msg._id !== optimisticMessage._id),
          sendingMessages: newSendingMessages,
        };
      });
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    const messageToDelete = messages.find(m => m._id === messageId);
    if (!messageToDelete) return;

    set(state => {
      const newDeletingMessages = state.deletingMessages instanceof Set ? new Set(state.deletingMessages) : new Set();
      newDeletingMessages.add(messageId);
      return {
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...m, isDeleting: true }
            : m
        ),
        deletingMessages: newDeletingMessages,
      };
    });

    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set(state => {
        const newDeletingMessages = state.deletingMessages instanceof Set ? new Set(state.deletingMessages) : new Set();
        newDeletingMessages.delete(messageId);
        return {
          messages: state.messages.map(m =>
            m._id === messageId
              ? { ...m, deleted: true, text: null, image: null, video: null, sticker: null, gif: null, isDeleting: false }
              : m
          ),
          deletingMessages: newDeletingMessages,
        };
      });
    } catch (error) {
      set(state => {
        const newDeletingMessages = state.deletingMessages instanceof Set ? new Set(state.deletingMessages) : new Set();
        newDeletingMessages.delete(messageId);
        return {
          messages: state.messages.map(m =>
            m._id === messageId
              ? { ...m, isDeleting: false }
              : m
          ),
          deletingMessages: newDeletingMessages,
        };
      });
      toast.error("Failed to delete message");
      console.error("Delete message error:", error);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      // ✅ FINAL FIX: Check if the sender is the selected user, using the correct ID structure.
      if ((newMessage.senderId === selectedUser?._id) || (newMessage.receiverId === selectedUser?._id)) {
        set(state => {
          const messageExists = state.messages.some(m => m._id === newMessage._id);
          if (!messageExists) {
            return { messages: [...state.messages, newMessage] };
          }
          return {};
        });
      }
    });

    socket.on("messageDeleted", ({ messageId, message }) => {
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...message, deleted: true }
            : m
        )
      }));
    });

    socket.on("messageReacted", ({ messageId, reactions }) => {
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...m, reactions }
            : m
        )
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageReacted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  addReaction: async (messageId, emoji) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;

    set(state => ({
      messages: state.messages.map(m => {
        if (m._id === messageId) {
          const existingReactionIndex = m.reactions.findIndex(r => r.userId._id === authUser._id);
          let newReactions = [...m.reactions];
          if (existingReactionIndex !== -1) {
            if (newReactions[existingReactionIndex].emoji === emoji) {
              newReactions.splice(existingReactionIndex, 1);
            } else {
              newReactions[existingReactionIndex] = { ...newReactions[existingReactionIndex], emoji };
            }
          } else {
            newReactions.push({
              userId: { _id: authUser._id, fullName: authUser.fullName, profilePic: authUser.profilePic },
              emoji
            });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      })
    }));

    try {
      await axios.post(`/api/messages/${messageId}/react`, { emoji }, { withCredentials: true });
    } catch (error) {
      const { selectedUser } = get();
      if (selectedUser) {
        get().getMessages(selectedUser._id);
      }
      toast.error("Failed to add reaction");
    }
  }
}));