import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";
import { Download, Trash, X, ChevronDown, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const emojiOptions = ["👍", "❤️", "😂", "😢", "😮", "🙏"];
const LONG_PRESS_THRESHOLD = 500;
const LIVE_EMOJI_HOVER_THRESHOLD = 500;

const ChatContainer = () => {
  const {
    messages = [],
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    addReaction,
    sendingMessages,
    deletingMessages
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoUser, setInfoUser] = useState(null);

  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showFullEmojiPickerId, setShowFullEmojiPickerId] = useState(null);
  const [fullPickerVerticalPosition, setFullPickerVerticalPosition] = useState('');

  const longPressTimerRef = useRef(null);
  const quickReactionPickerRef = useRef(null);
  const fullEmojiPickerRef = useRef(null);
  const messageBubbleRef = useRef(null);
  const messagesScrollContainerRef = useRef(null);

  const [liveEmoji, setLiveEmoji] = useState(null);
  const liveEmojiTimerRef = useRef(null);

  const closeAllReactionPickers = useCallback(() => {
    setShowReactionPicker(null);
    setShowFullEmojiPickerId(null);
    setLiveEmoji(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedQuickPicker = quickReactionPickerRef.current && quickReactionPickerRef.current.contains(event.target);
      const clickedFullPicker = fullEmojiPickerRef.current && fullEmojiPickerRef.current.contains(event.target);

      if (showReactionPicker && !clickedQuickPicker) {
        closeAllReactionPickers();
      } else if (showFullEmojiPickerId && !clickedFullPicker) {
        closeAllReactionPickers();
      }
    };

    if (showReactionPicker || showFullEmojiPickerId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showReactionPicker, showFullEmojiPickerId, closeAllReactionPickers]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useLayoutEffect(() => {
  if (messageEndRef.current && messages.length > 0) {
    const scrollTimeout = setTimeout(() => {
      messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0); 
    return () => clearTimeout(scrollTimeout); 
  }
}, [messages.length, isMessagesLoading]);

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

  const handleReact = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
    closeAllReactionPickers();
  };

  const handleMessageMouseDown = (messageId) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
        setShowReactionPicker(messageId);
    }, LONG_PRESS_THRESHOLD);
  };

  const handleMessageMouseUp = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleMessageTouchStart = (messageId) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
        setShowReactionPicker(messageId);
    }, LONG_PRESS_THRESHOLD);
  };

  const handleMessageTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleMessageTouchCancel = () => {
      clearTimeout(longPressTimerRef.current);
  };

  const handleEmojiMouseEnter = (emoji) => {
    if (liveEmojiTimerRef.current) clearTimeout(liveEmojiTimerRef.current);
    liveEmojiTimerRef.current = setTimeout(() => {
        setLiveEmoji(emoji);
    }, LIVE_EMOJI_HOVER_THRESHOLD);
  };

  const handleEmojiMouseLeave = () => {
    clearTimeout(liveEmojiTimerRef.current);
    setLiveEmoji(null);
  };

  const handleFullEmojiSelect = (messageId, emoji) => {
    handleReact(messageId, emoji.native);
    closeAllReactionPickers();
  };

  const determineFullPickerPosition = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-id-${messageId}`);
    const scrollContainer = messagesScrollContainerRef.current;

    if (messageElement && scrollContainer) {
      const messageRect = messageElement.getBoundingClientRect();
      const scrollRect = scrollContainer.getBoundingClientRect();

      const pickerEstimatedHeight = 400;
      const bufferSpace = 20;

      const spaceBelow = scrollRect.bottom - messageRect.bottom;
      const spaceAbove = messageRect.top - scrollRect.top;

      if (spaceBelow >= pickerEstimatedHeight + bufferSpace) {
        setFullPickerVerticalPosition('top-full');
      } else if (spaceAbove >= pickerEstimatedHeight + bufferSpace) {
        setFullPickerVerticalPosition('bottom-[calc(100%+8px)]');
      } else {
        if (spaceBelow > spaceAbove) {
             setFullPickerVerticalPosition('top-full');
        } else {
             setFullPickerVerticalPosition('bottom-[calc(100%+8px)]');
        }
      }
    } else {
      setFullPickerVerticalPosition('bottom-[calc(100%+8px)]');
    }
  }, []);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput className="flex-shrink-0" selectedUser={selectedUser} getMessages={getMessages} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader />

      <div ref={messagesScrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {Array.isArray(messages) && messages.map((message, index) => {
          // ✅ FINAL FIX: This robust check gets the sender's ID whether it's a string or an object,
          // ensuring the message is always on the correct side.
          const senderIdFromMessage = typeof message.senderId === 'object' 
                                      ? message.senderId._id 
                                      : message.senderId;
          const isMyMessage = senderIdFromMessage === authUser._id;
          const isMessageDeleted = message.deleted;
          const isLastMessage = index === messages.length - 1;
          const isMessageSending = sendingMessages instanceof Set && sendingMessages.has(message._id) || message.isSending;
          const isMessageDeleting = deletingMessages instanceof Set && deletingMessages.has(message._id) || message.isDeleting;

          const isQuickPickerActive = showReactionPicker === message._id;
          const isFullPickerActive = showFullEmojiPickerId === message._id;

          const showArrowButton = !isMessageDeleted && !isQuickPickerActive && !isFullPickerActive && !isMessageSending && !isMessageDeleting;
          const commonPickerButtonClasses = `p-1 rounded-full text-xl transition-all duration-150 ease-in-out transform hover:scale-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75`;

          return (
            <div
              key={message._id}
              id={`message-id-${message._id}`}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"} relative`}
              ref={isLastMessage ? messageEndRef : null}
            >
              <div className="chat-image avatar">
                <div
                  className="size-10 rounded-full border cursor-pointer transition hover:scale-105"
                  title="View user info"
                  onClick={() => {
                    setInfoUser(isMyMessage ? authUser : selectedUser);
                    setShowInfo(true);
                  }}
                >
                  <img
                    src={
                      isMyMessage
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1 flex items-center justify-between">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>

                {isMyMessage && !isMessageDeleted && (
                  <button
                    onClick={() => !isMessageDeleting && handleDeleteMessage(message._id)}
                    className="ml-2 p-1 rounded-full
                      bg-white/30 backdrop-blur-md shadow-lg
                      hover:bg-red-500/60 hover:scale-110 transition-all duration-300
                      border border-white/40
                      text-red-500 disabled:opacity-50"
                    title="Delete message"
                    disabled={isMessageDeleting}
                  >
                    {isMessageDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash size={18} />}
                  </button>
                )}
              </div>

              <div
                className={`flex items-center gap-1 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}
                onMouseDown={() => handleMessageMouseDown(message._id)}
                onMouseUp={handleMessageMouseUp}
                onTouchStart={() => handleMessageTouchStart(message._id)}
                onTouchEnd={handleMessageTouchEnd}
                onTouchCancel={handleMessageTouchCancel}
              >
                <div
                  ref={messageBubbleRef}
                  className={`chat-bubble flex flex-col relative
                    ${isMyMessage ? "bg-primary text-white" : "bg-base-300 text-base-content"}
                    ${isMessageSending ? "opacity-70" : ""}
                    ${isMessageDeleting ? "opacity-50" : ""}`}
                >
                  <>
                    {isMessageSending && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Loader2 size={10} className="animate-spin text-white" />
                      </div>
                    )}
                    
                    {isMessageDeleting && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-red-500" />
                      </div>
                    )}
                    {isMessageDeleted ? (
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
                        {message.sticker && (
                            <div className="relative mb-2">
                                <img
                                    src={message.sticker}
                                    alt="Sticker"
                                    className="sm:max-w-[120px] rounded-md object-contain cursor-pointer"
                                />
                            </div>
                        )}
                        {message.gif && (
                            <div className="relative mb-2">
                                <img
                                    src={message.gif}
                                    alt="GIF"
                                    className="sm:max-w-[200px] rounded-md object-contain cursor-pointer"
                                />
                            </div>
                        )}
                        {message.text && (
                            <p className="max-w-xs">
                                {message.text}
                            </p>
                        )}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap justify-end">
                            {message.reactions.map((r, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-full bg-white/30 backdrop-blur-md text-xs border border-white/40"
                                title={r.userId?.fullName || "User"}
                              >
                                {r.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                        {isQuickPickerActive && !isMessageDeleted && (
                            <div
                                ref={quickReactionPickerRef}
                                className={`absolute z-20 flex flex-row gap-0.5 px-1.5 py-1 rounded-full shadow-lg
                                    bg-base-100/90 backdrop-blur-md border border-base-content/20
                                    ${isMyMessage ? 'bottom-[calc(100%+8px)] right-0' : 'bottom-[calc(100%+8px)] left-0'}
                                    `}
                            >
                                {emojiOptions.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReact(message._id, emoji)}
                                        onMouseEnter={() => handleEmojiMouseEnter(emoji)}
                                        onMouseLeave={handleEmojiMouseLeave}
                                        className={`${commonPickerButtonClasses} ${liveEmoji === emoji ? 'animate-bounce' : ''}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                                <button
                                    className={`${commonPickerButtonClasses} text-base-content`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFullEmojiPickerId(message._id);
                                        setShowReactionPicker(null);
                                        determineFullPickerPosition(message._id);
                                    }}
                                    title="More emojis"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        )}
                        {isFullPickerActive && !isMessageDeleted && (
                            <div
                                ref={fullEmojiPickerRef}
                                className={`absolute z-30 ${fullPickerVerticalPosition}
                                    ${isMyMessage ? 'right-0' : 'left-0'}
                                    `}
                            >
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji) => handleFullEmojiSelect(message._id, emoji)}
                                    theme="light"
                                    previewPosition="none"
                                />
                            </div>
                        )}
                      </>
                    )}
                  </>
                </div>
                {showArrowButton && !isMessageDeleted && !isMessageSending && !isMessageDeleting && (
                    <div
                        className={`relative z-10 flex ${isMyMessage ? 'justify-start' : 'justify-end'}`}
                    >
                        <button
                            className={`p-1 rounded-full bg-base-100/70 backdrop-blur-sm shadow-md
                                hover:bg-base-100 transition-colors duration-200
                                border border-base-content/20 text-base-content`}
                            onClick={() => setShowReactionPicker(message._id)}
                            title="React to message"
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput className="flex-shrink-0" selectedUser={selectedUser} />

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;