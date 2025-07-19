import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";
import { Download, Trash, X, ChevronDown, Plus } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
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
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoUser, setInfoUser] = useState(null);

  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showFullEmojiPickerId, setShowFullEmojiPickerId] = useState(null);
  const [fullPickerVerticalPosition, setFullPickerVerticalPosition] = useState('');

  const [hoveredMessageId, setHoveredMessageId] = useState(null);
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
    setHoveredMessageId(null);
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

  useEffect(() => {
    if (messageEndRef.current) {
        const timer = setTimeout(() => {
            messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
        return () => clearTimeout(timer);
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
    try {
      await axios.post(`/api/messages/${messageId}/react`, { emoji }, { withCredentials: true });
      await getMessages(selectedUser._id);
      closeAllReactionPickers();
    } catch (err) {
      console.error("Error reacting:", err);
      toast.error("Failed to add reaction");
    }
  };

  const handleMessageMouseEnter = (messageId) => {
    setHoveredMessageId(messageId);
  };

  const handleMessageMouseLeave = () => {
    if (showReactionPicker !== hoveredMessageId && showFullEmojiPickerId !== hoveredMessageId) {
        setHoveredMessageId(null);
    }
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
          // --- MOVED DEFINITIONS INSIDE LOOP ---
          const isMyMessage = message.senderId === authUser._id;
          const isMessageDeleted = message.deleted;
          const isLastMessage = index === messages.length - 1;

          const isQuickPickerActive = showReactionPicker === message._id;
          const isFullPickerActive = showFullEmojiPickerId === message._id;
          // --- END MOVED DEFINITIONS ---

          // showArrowButton now uses correctly scoped variables
          const showArrowButton = hoveredMessageId === message._id && !isMessageDeleted && !isQuickPickerActive && !isFullPickerActive;

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

              <div
                className={`flex items-center gap-1 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}
                onMouseEnter={() => handleMessageMouseEnter(message._id)}
                onMouseLeave={handleMessageMouseLeave}
                onMouseDown={() => handleMessageMouseDown(message._id)}
                onMouseUp={handleMessageMouseUp}
                onTouchStart={() => handleMessageTouchStart(message._id)}
                onTouchEnd={handleMessageTouchEnd}
                onTouchCancel={handleMessageTouchCancel}
              >
                <div
                  ref={messageBubbleRef}
                  className={`chat-bubble flex flex-col relative
                    ${isMyMessage ? "bg-primary text-white" : "bg-base-300 text-base-content"}`}
                >
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

                      {/* 🟣 Reactions list (applied reactions) */}
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

                      {/* 🟣 Quick Emoji Picker (6 emojis + Plus button) */}
                      {isQuickPickerActive && !isMessageDeleted && (
                          <div
                              ref={quickReactionPickerRef}
                              className={`absolute z-20 flex flex-row gap-0.5 px-1.5 py-1 rounded-full shadow-lg
                                  bg-base-100/90 backdrop-blur-md border border-base-content/20
                                  ${isMyMessage ? 'bottom-[calc(100%+8px)] right-0' : 'bottom-[calc(100%+8px)] left-0'}
                                  `}
                              onMouseEnter={() => setHoveredMessageId(message._id)}
                              onMouseLeave={() => { /* Handled by handleClickOutside */ }}
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

                      {/* 🟣 Full Emoji Picker (searchable) */}
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
                </div>

                {/* 🟣 The ChevronDown reaction trigger button (beside the bubble) */}
                {showArrowButton && !isMessageDeleted && (
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

      <MessageInput className="flex-shrink-0" selectedUser={selectedUser} getMessages={getMessages} />

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