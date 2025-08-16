import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

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
      const res = await axiosInstance.get("/messages/users");
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
    const { selectedUser, messages } = get();
    if (!selectedUser) return toast.error("No user selected");

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message");
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    const messageToDelete = messages.find((m) => m._id === messageId);
    if (!messageToDelete) return;

    set((state) => {
      const newDeletingMessages = new Set(state.deletingMessages);
      newDeletingMessages.add(messageId);
      return {
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, isDeleting: true } : m
        ),
        deletingMessages: newDeletingMessages,
      };
    });

    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set((state) => {
        const newDeletingMessages = new Set(state.deletingMessages);
        newDeletingMessages.delete(messageId);
        return { deletingMessages: newDeletingMessages };
      });
    } catch (error) {
      set((state) => {
        const newDeletingMessages = new Set(state.deletingMessages);
        newDeletingMessages.delete(messageId);
        return {
          messages: state.messages.map((m) =>
            m._id === messageId ? { ...m, isDeleting: false } : m
          ),
          deletingMessages: newDeletingMessages,
        };
      });
      toast.error("Failed to delete message");
      console.error("Delete message error:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return console.warn("Socket not initialized");

    socket.on("newMessage", (newMessage) => {
      const isRelevant =
        newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id;
      if (!isRelevant) return;

      set({ messages: [...get().messages, newMessage] });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? {
                ...m,
                deleted: true,
                text: "This message was deleted.",
                image: null,
                video: null,
                sticker: null,
                gif: null,
                isDeleting: false,
              }
            : m
        ),
      }));
    });

    socket.on("messageReacted", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageReacted");
    set({ deletingMessages: new Set() }); // cleanup
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  addReaction: async (messageId, emoji) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;

    set((state) => ({
      messages: state.messages.map((m) => {
        if (m._id === messageId) {
          const reactions = m.reactions || [];
          const existingReactionIndex = reactions.findIndex(
            (r) => r.userId._id === authUser._id
          );
          let newReactions = [...reactions];

          if (existingReactionIndex !== -1) {
            if (newReactions[existingReactionIndex].emoji === emoji) {
              newReactions.splice(existingReactionIndex, 1);
            } else {
              newReactions[existingReactionIndex] = {
                ...newReactions[existingReactionIndex],
                emoji,
              };
            }
          } else {
            newReactions.push({
              userId: {
                _id: authUser._id,
                fullName: authUser.fullName,
                profilePic: authUser.profilePic,
              },
              emoji,
            });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      }),
    }));

    try {
      await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    } catch (error) {
      const { selectedUser } = get();
      if (selectedUser) get().getMessages(selectedUser._id);
      toast.error("Failed to add reaction");
    }
  },
}));
