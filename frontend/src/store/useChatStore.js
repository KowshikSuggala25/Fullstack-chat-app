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

  sendMessage: async (messageData, previewData = {}) => {
    const { selectedUser } = get();
    const { authUser, socket } = useAuthStore.getState();

    if (!selectedUser || !authUser) {
      toast.error("No user selected");
      return;
    }
    
    const isFormData = messageData instanceof FormData;
    const optimisticId = `temp-${Date.now()}`;
    
    let optimisticMessage;
    if (isFormData) {
      optimisticMessage = {
        _id: optimisticId,
        senderId: authUser._id,
        receiverId: selectedUser._id,
        text: messageData.get('text') || null,
        image: previewData.image || null,
        video: previewData.video || null,
        createdAt: new Date().toISOString(),
        reactions: [],
        deleted: false,
        isOptimistic: true,
        isSending: true
      };
    } else {
      optimisticMessage = {
        _id: optimisticId,
        senderId: authUser._id,
        receiverId: selectedUser._id,
        text: messageData.text || null,
        sticker: messageData.sticker || null,
        gif: messageData.gif || null,
        createdAt: new Date().toISOString(),
        reactions: [],
        deleted: false,
        isOptimistic: true,
        isSending: true
      };
    }

    set(state => {
      const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
      newSendingMessages.add(optimisticId);
      return {
        messages: [...state.messages, optimisticMessage],
        sendingMessages: newSendingMessages,
      };
    });

    try {
      const config = {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
      };

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        isFormData ? messageData : messageData,
        config
      );
      
      const savedMessage = res.data;

      set(state => {
        const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
        newSendingMessages.delete(optimisticId);
        
        // ✅ FIX: This logic is now handled by the 'newMessage' socket event on the client. // 🔴 Change: Commented out the client-side state update to prevent duplicates.
        // The server will emit the new message, and the 'newMessage' socket listener will handle the state update.
        /*
        const updatedMessages = state.messages.map(msg => {
          if (msg._id === optimisticId) {
            if (msg.image && msg.image.startsWith('blob:')) {
              URL.revokeObjectURL(msg.image);
            }
            if (msg.video && msg.video.startsWith('blob:')) {
              URL.revokeObjectURL(msg.video);
            }
            return savedMessage;
          }
          return msg;
        });
        */
        return {
          messages: state.messages,
          sendingMessages: newSendingMessages,
        };
      });

      // ✅ FIX: This emit is not necessary, as the server will broadcast the message after saving it. // 🔴 Change: Removed redundant socket.emit("sendMessage")
      // if (socket) {
      //   socket.emit("sendMessage", {
      //     receiverId: selectedUser._id,
      //     message: savedMessage
      //   });
      // }

    } catch (error) {
      set(state => {
        const newSendingMessages = state.sendingMessages instanceof Set ? new Set(state.sendingMessages) : new Set();
        newSendingMessages.delete(optimisticId);
        return {
          messages: state.messages.filter(msg => msg._id !== optimisticId),
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
      // ✅ FIX: No need to update state here. The socket event "messageDeleted" will handle it. // 🔴 Change: Removed redundant state update.
      // We only need to remove the deleting state after the API call succeeds.
      set(state => {
        const newDeletingMessages = state.deletingMessages instanceof Set ? new Set(state.deletingMessages) : new Set();
        newDeletingMessages.delete(messageId);
        return {
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
      const { selectedUser } = get(); // ✅ FIX: Get the latest state
      const isMyMessage = newMessage.senderId === useAuthStore.getState().authUser._id; // ✅ FIX: Check if the message is from me
      const messageExists = get().messages.some(m => m._id === newMessage._id); // ✅ FIX: Check if the message already exists

      if (!selectedUser) return;
      
      // Only update if the message is for the currently selected chat and it's a new message
      if ((newMessage.senderId === selectedUser._id || isMyMessage) && !messageExists) {
        // Use set with a function to ensure we're using the latest state
        set(state => ({
          messages: [...state.messages.filter(m => m._id !== newMessage.tempId), newMessage] // ✅ FIX: Remove optimistic message and add real one
        }));
      } else if (isMyMessage && messageExists) {
        // If the message is mine and exists, replace the optimistic message with the real one.
        set(state => ({
          messages: state.messages.map(m => m._id === newMessage.tempId ? newMessage : m)
        }));
      }
    });

    socket.on("messageDeleted", ({ messageId }) => { // ✅ FIX: Destructure just the messageId
      set(state => ({
        messages: state.messages.map(m =>
          m._id === messageId
            ? { ...m, deleted: true, text: "This message was deleted.", image: null, video: null, sticker: null, gif: null } // ✅ FIX: Set text and clear other content for the recipient
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