import { useRef, useState, useEffect, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, Smile, X, Video, Sparkles, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const GIPHY_API_KEY = "KN8iK1DEZPWMuVguf5tzRtlsvxmJCLly"; 
const GIPHY_TRENDING_STICKERS_URL = `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_SEARCH_STICKERS_URL = (query) => `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`;
const GIPHY_TRENDING_GIFS_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_SEARCH_GIFS_URL = (query) => `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`;


const MessageInput = ({ className, selectedUser, getMessages }) => {
    const [text, setText] = useState("");
    const [fileToUpload, setFileToUpload] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    
    const { sendMessage, sendingMessages } = useChatStore();
    const isSending = sendingMessages.size > 0;
    
    const [activeMediaType, setActiveMediaType] = useState('stickers');
    const [mediaItems, setMediaItems] = useState([]);
    const [mediaSearchTerm, setMediaSearchTerm] = useState("");
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [isUploadingPreview, setIsUploadingPreview] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const mediaButtonRef = useRef(null);
    const mediaPickerRef = useRef(null);

    const closeAllPickers = useCallback(() => {
        setShowEmojiPicker(false);
        setShowMediaPicker(false);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) ||
                (showMediaPicker && mediaPickerRef.current && !mediaPickerRef.current.contains(event.target) && mediaButtonRef.current && !mediaButtonRef.current.contains(event.target))
            ) {
                closeAllPickers();
            }
        };

        if (showEmojiPicker || showMediaPicker) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [showEmojiPicker, showMediaPicker, closeAllPickers]);


    useEffect(() => {
        const fetchMedia = async () => {
            if (!GIPHY_API_KEY || GIPHY_API_KEY === "YOUR_GIPHY_API_KEY") {
                console.warn("GIPHY API Key is not set. Media will not load.");
                setMediaItems([]);
                return;
            }

            setIsMediaLoading(true);
            try {
                let url;
                if (activeMediaType === 'stickers') {
                    url = mediaSearchTerm.trim()
                        ? GIPHY_SEARCH_STICKERS_URL(mediaSearchTerm)
                        : GIPHY_TRENDING_STICKERS_URL;
                } else { // activeMediaType === 'gifs'
                    url = mediaSearchTerm.trim()
                        ? GIPHY_SEARCH_GIFS_URL(mediaSearchTerm)
                        : GIPHY_TRENDING_GIFS_URL;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                setMediaItems(data.data);
            } catch (error) {
                console.error("Error fetching media from GIPHY:", error);
                toast.error("Failed to load media.");
                setMediaItems([]);
            } finally {
                setIsMediaLoading(false);
            }
        };

        if (showMediaPicker) {
            const debounceTimer = setTimeout(() => {
                fetchMedia();
            }, mediaSearchTerm.trim() ? 500 : 0);
            return () => clearTimeout(debounceTimer);
        } else {
            setMediaSearchTerm("");
            setMediaItems([]);
        }
    }, [showMediaPicker, activeMediaType, mediaSearchTerm]);

    // ✅ FIX: Use URL.createObjectURL for reliable previews
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) { 
            toast.error("File size cannot exceed 20MB");
            return;
        }

        closeAllPickers();
        setFileToUpload(file);
        
        if (file.type.startsWith("image/")) {
            setImagePreview(URL.createObjectURL(file));
            setVideoPreview(null);
        } else if (file.type.startsWith("video/")) {
            setVideoPreview(URL.createObjectURL(file));
            setImagePreview(null);
        } else {
            toast.error("Please select an image or video file.");
            removeMedia();
        }
    };

    const removeMedia = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setFileToUpload(null);
        setImagePreview(null);
        setVideoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();

        const hasText = text.trim();
        const hasFile = fileToUpload;
        
        if (!hasText && !hasFile) return;

        if (!selectedUser?._id) {
            toast.error("Please select a user to chat with.");
            return;
        }

        let messageData = {};
        if(hasFile) {
            messageData = new FormData();
            messageData.append('file', fileToUpload);
            if (hasText) {
                messageData.append('text', text);
            }
        } else {
            messageData = { text: hasText ? text : null };
        }

        const previewData = {
          image: imagePreview,
          video: videoPreview,
        }

        setText("");
        removeMedia();

        try {
            // ✅ FIX: Pass the preview data to the sendMessage function
            await sendMessage(messageData, previewData);
        } catch (error) {
            console.error("Error sending message:", error);
            setText(text || "");
            if (hasFile) {
                setFileToUpload(hasFile);
                if (hasFile.type.startsWith('image/')) setImagePreview(URL.createObjectURL(hasFile));
                if (hasFile.type.startsWith('video/')) setVideoPreview(URL.createObjectURL(hasFile));
            }
        }
    };
    
    const handleMediaSelect = (mediaItem) => {
        const mediaUrl = mediaItem.images.fixed_height.url;
        
        let messageData = {};
        if (activeMediaType === 'gifs') {
            messageData.gif = mediaUrl;
        } else {
            messageData.sticker = mediaUrl;
        }
        
        closeAllPickers();
        sendMessage(messageData);
    };

    const formBaseHeight = '4rem';
    const previewHeight = '6rem';

    return (
        <div 
            className={`p-2 flex-shrink-0 border-t border-base-200 bg-base-100 relative ${className} 
                        transition-all duration-300 ease-in-out`}
            style={{ height: (imagePreview || videoPreview) ? `calc(${previewHeight} + ${formBaseHeight})` : formBaseHeight }}
        >
            <div 
                className="relative w-full transition-all duration-300 ease-in-out overflow-hidden" 
                style={{ height: (imagePreview || videoPreview) ? previewHeight : '0' }} 
            >
                {(imagePreview || videoPreview) && (
                    <div className="flex items-center gap-2 px-2 py-2 absolute inset-0">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Image Preview"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {videoPreview && (
                                <video
                                    src={videoPreview}
                                    controls
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <button
                                onClick={removeMedia}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-error z-20"
                                type="button"
                                title="Remove media"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                        <div className="flex-1 text-sm text-zinc-500 truncate">
                            {fileToUpload?.name}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSendMessage}
                className="flex-shrink-0 flex items-center gap-2 w-full px-2 py-2"
                style={{ height: formBaseHeight }}
            >
                <div className="flex gap-1">
                    <button
                        type="button"
                        className="p-2 rounded-full text-base-content hover:bg-base-200 transition-all duration-300 bg-white/30 backdrop-blur-md shadow-lg border border-white/40 hover:scale-110"
                        onClick={() => {
                            setShowEmojiPicker(prev => !prev);
                            setShowMediaPicker(false);
                        }}
                        ref={emojiButtonRef}
                        title="Emoji"
                    >
                        <Smile size={20} />
                    </button>

                    <button
                        type="button"
                        className="p-2 rounded-full text-base-content hover:bg-base-200 transition-colors bg-white/30 backdrop-blur-md shadow-lg border border-white/40 hover:scale-110"
                        onClick={() => {
                            setShowMediaPicker(prev => !prev);
                            setShowEmojiPicker(false);
                            setMediaSearchTerm("");
                            setActiveMediaType('stickers');
                        }}
                        ref={mediaButtonRef}
                        title="Stickers / GIFs"
                    >
                        <Sparkles size={20} />
                    </button>

                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        className={`p-2 rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/40
                                    hover:bg-white/60 hover:scale-110 transition-all duration-300
                                    ${imagePreview || videoPreview ? "text-emerald-500" : "text-primary"}`}
                        onClick={() => {
                            fileInputRef.current?.click();
                            closeAllPickers();
                        }}
                        title="Attach media"
                    >
                        <Image size={20} />
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 input input-bordered rounded-full h-10 min-h-10 text-sm"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onFocus={closeAllPickers}
                />

                <button
                    type="submit"
                    className="p-2 rounded-full bg-primary/70 backdrop-blur-md shadow-lg
                                hover:bg-primary hover:scale-110 transition-all duration-300
                                border border-white/40 text-white h-10 min-h-10 flex items-center justify-center"
                    disabled={isSending || (!text.trim() && !imagePreview && !videoPreview)}
                    title="Send"
                >
                    {isSending ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <Send size={20} />
                    )}
                </button>
            </form>

            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+12px)] left-2 z-30">
                    <Picker data={data} onEmojiSelect={handleEmojiSelect} />
                </div>
            )}

            {showMediaPicker && (
                <div
                    ref={mediaPickerRef}
                    className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2
                               w-80 max-h-80 overflow-y-auto z-30
                               bg-base-100/90 backdrop-blur-md border border-base-content/20 rounded-lg shadow-xl
                               p-3 flex flex-col gap-2"
                >
                    <div className="flex gap-2 mb-2 justify-center">
                        <button
                            className={`btn btn-sm rounded-full ${activeMediaType === 'stickers' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => { setActiveMediaType('stickers'); setMediaSearchTerm(''); }}
                        >
                            Stickers
                        </button>
                        <button
                            className={`btn btn-sm rounded-full ${activeMediaType === 'gifs' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => { setActiveMediaType('gifs'); setMediaSearchTerm(''); }}
                        >
                            GIFs
                        </button>
                    </div>

                    <div className="w-full relative mb-2">
                        <input
                            type="text"
                            placeholder={`Search ${activeMediaType}...`}
                            className="input input-sm w-full input-bordered rounded-full pr-8"
                            value={mediaSearchTerm}
                            onChange={(e) => setMediaSearchTerm(e.target.value)}
                        />
                        {mediaSearchTerm && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500"
                                onClick={() => setMediaSearchTerm("")}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {isMediaLoading ? (
                        <div className="flex justify-center items-center h-full w-full py-10">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2 justify-center overflow-y-auto max-h-60">
                            {mediaItems.length > 0 ? (
                                mediaItems.map((mediaItem, index) => (
                                    <button
                                        key={mediaItem.id || index}
                                        onClick={(e) => handleMediaSelect(mediaItem)}
                                        className="p-1 rounded-md hover:bg-base-200 transition-all duration-150 transform hover:scale-105"
                                    >
                                        <img
                                            src={mediaItem.images.fixed_height.url}
                                            alt={mediaItem.title || `Media ${index + 1}`}
                                            className="w-16 h-16 object-contain"
                                        />
                                    </button>
                                ))
                            ) : (
                                <div className="text-center text-zinc-500 py-4 w-full">No {activeMediaType} found.</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageInput;