import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Download, Trash, X } from "lucide-react";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages = [],
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoUser, setInfoUser] = useState(null);

  useEffect(() => {
    if (!selectedUser?._id) return;

    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    const confirmed = window.confirm("Are you sure you want to delete this message?");
    if (!confirmed) return;

    try {
      await deleteMessage(messageId);
      toast.success("Message deleted");
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to delete message");
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.isArray(messages) && messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div
                className="size-10 rounded-full border cursor-pointer transition hover:scale-105"
                title="View user info"
                onClick={() => {
                  setInfoUser(message.senderId === authUser._id ? authUser : selectedUser);
                  setShowInfo(true);
                }}
              >
                <img
                  src={message.senderId === authUser._id
                    ? authUser.profilePic || "/avatar.png"
                    : selectedUser.profilePic || "/avatar.png"}
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1 flex items-center justify-between">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>

              {message.senderId === authUser._id && !message.deleted && (
                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="ml-2 p-1 rounded-full
                    bg-white/30 backdrop-blur-md shadow-lg
                    hover:bg-red-500/60 hover:scale-110 transition-all duration-300
                    border border-white/40
                    text-red-500"
                  title="Delete message"
                >
                  <Trash size={18} />
                </button>
              )}
            </div>

            <div className="chat-bubble flex flex-col relative">
              {message.deleted ? (
                <p className="italic text-zinc-400">This message was deleted.</p>
              ) : (
                <>
                  {message.image && (
                    <div className="relative">
                      <a href={message.image} target="_blank" rel="noopener noreferrer">
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition"
                        />
                      </a>
                      <a
                        href={message.image}
                        download
                        className="absolute top-1 right-1 p-1 rounded-full
                          bg-white/30 backdrop-blur-md shadow-lg
                          hover:bg-white/60 hover:scale-110 transition-all duration-300
                          border border-white/40 text-primary"
                        title="Download image"
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  )}

                  {message.video && (
                    <div className="relative">
                      <video
                        controls
                        src={message.video}
                        className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition"
                      />
                      <a
                        href={message.video}
                        download
                        className="absolute top-1 right-1 p-1 rounded-full
                          bg-white/30 backdrop-blur-md shadow-lg
                          hover:bg-white/60 hover:scale-110 transition-all duration-300
                          border border-white/40 text-primary"
                        title="Download video"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  )}

                  {message.text && <p>{message.text}</p>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* User Info Modal */}
      {showInfo && infoUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/40 min-w-[300px] relative">
            <button
              className="absolute top-2 right-2 p-2 rounded-full
                bg-white/30 backdrop-blur-md shadow-lg
                hover:bg-red-500/60 hover:scale-110 transition-all duration-300
                border border-white/40 text-zinc-700"
              onClick={() => setShowInfo(false)}
              title="Close"
            >
              <X />
            </button>
            <div className="flex flex-col items-center gap-3">
              <img
                src={infoUser.profilePic || "/avatar.png"}
                alt={infoUser.fullName}
                className="size-16 rounded-full border"
              />
              <h2 className="font-bold text-lg">{infoUser.fullName}</h2>
              <p className="text-sm text-zinc-500">{infoUser.email}</p>
              {/* Add more info if needed */}
            </div>
          </div>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
