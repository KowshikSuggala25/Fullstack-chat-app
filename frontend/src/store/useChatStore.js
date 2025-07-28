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
  sendingMessages: new Set(), // Track messages being sent
  deletingMessages: new Set(), // Track messages being deleted

  // 🔹 Sidebar open/close state (for responsive layout)
  isSidebarOpen: true,
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

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

  // 🔹 Send message with optimistic updates
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser, socket } = useAuthStore.getState();

    if (!selectedUser || !authUser) return toast.error("No user selected");

    // Create optimistic message
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || null,
      image: messageData.image || null,
      video: messageData.video || null,
      sticker: messageData.sticker || null,
      gif: messageData.gif || null,
      createdAt: new Date().toISOString(),
      reactions: [],
      deleted: false,
      isOptimistic: true,
      isSending: true
    };

    // Add optimistic message immediately
    set({ 
      messages: [...messages, optimisticMessage],
      sendingMessages: new Set([...get().sendingMessages, optimisticMessage._id])
    });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;

      // Replace optimistic message with real message
      set(state => ({
        messages: state.messages.map(msg => 
          msg._id === optimisticMessage._id ? savedMessage : msg
        ),
        sendingMessages: new Set([...state.sendingMessages].filter(id => id !== optimisticMessage._id))
      }));

      // Emit to socket for real-time updates
      if (socket) {
        socket.emit("sendMessage", {
          receiverId: selectedUser._id,
          message: savedMessage
        });
      }

    } catch (error) {
      // Remove failed optimistic message
      set(state => ({
        messages: state.messages.filter(msg => msg._id !== optimisticMessage._id),
        sendingMessages: new Set([...state.sendingMessages].filter(id => id !== optimisticMessage._id))
      }));
      
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  },

  // 🔹 Delete message with optimistic updates
  deleteMessage: async (messageId) => {
    const { messages } = get();
    
    // Find the message to delete
    const messageToDelete = messages.find(m => m._id === messageId);
    if (!messageToDelete) return;

    // Optimistic update - mark as deleting
    set(state => ({
      messages: state.messages.map(m =>
        m._id === messageId
          ? { ...m, isDeleting: true }
          : m
      ),
      deletingMessages: new Set([...state.deletingMessages, messageId])
    }));

    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      
      // Update message as deleted
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...m, deleted: true, text: null, image: null, video: null, sticker: null, gif: null, isDeleting: false }
            : m
        ),
        deletingMessages: new Set([...state.deletingMessages].filter(id => id !== messageId))
      }));

    } catch (error) {
      // Revert optimistic update on error
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...m, isDeleting: false }
            : m
        ),
        deletingMessages: new Set([...state.deletingMessages].filter(id => id !== messageId))
      }));
      
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
      
      // Only add if it's from the selected user and not already in messages
      if (newMessage.senderId === selectedUser?._id) {
        const messageExists = messages.some(m => m._id === newMessage._id);
        if (!messageExists) {
          set({ messages: [...messages, newMessage] });
        }
      }
    });

    // ✅ Deleted message event
    socket.on("messageDeleted", ({ messageId, message }) => {
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...message, deleted: true }
            : m
        )
      }));
    });

    // ✅ Message reaction event
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

  // 🔹 Unsubscribe from socket
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageReacted");
  },

  // 🔹 Change selected user
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  // 🔹 Add message reaction with optimistic updates
  addReaction: async (messageId, emoji) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;

    // Optimistic update
    set(state => ({
      messages: state.messages.map(m => {
        if (m._id === messageId) {
          const existingReactionIndex = m.reactions.findIndex(r => r.userId._id === authUser._id);
          let newReactions = [...m.reactions];
          
          if (existingReactionIndex !== -1) {
            if (newReactions[existingReactionIndex].emoji === emoji) {
              // Remove reaction
              newReactions.splice(existingReactionIndex, 1);
            } else {
              // Update reaction
              newReactions[existingReactionIndex] = { ...newReactions[existingReactionIndex], emoji };
            }
          } else {
            // Add new reaction
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
      // Revert on error - refetch messages
      const { selectedUser } = get();
      if (selectedUser) {
        get().getMessages(selectedUser._id);
      }
      toast.error("Failed to add reaction");
    }
  }
}));