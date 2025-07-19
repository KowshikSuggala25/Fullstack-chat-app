import { useRef, useState, useEffect, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, Smile, X, Video, Sparkles, Search } from "lucide-react";
import toast from "react-hot-toast";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import axios from "axios";

// !! IMPORTANT: Your GIPHY API Key !!
const GIPHY_API_KEY = "KN8iK1DEZPWMuVguf5tzRtlsvxmJCLly"; // Your provided API Key
const GIPHY_TRENDING_STICKERS_URL = `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_SEARCH_STICKERS_URL = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_TRENDING_GIFS_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_SEARCH_GIFS_URL = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;


const MessageInput = ({ className, selectedUser, getMessages }) => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    const [activeMediaType, setActiveMediaType] = useState('stickers');
    const [mediaItems, setMediaItems] = useState([]);
    const [mediaSearchTerm, setMediaSearchTerm] = useState("");
    const [isMediaLoading, setIsMediaLoading] = useState(false);

    const [isSending, setIsSending] = useState(false); // <--- THIS IS HERE
    const [isUploadingPreview, setIsUploadingPreview] = useState(false); // <--- THIS IS HERE
    const [uploadProgress, setUploadProgress] = useState(0); // <--- THIS IS HERE


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
        const handleClickOutsideEmoji = (event) => {
            if (
                showEmojiPicker &&
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target)
            ) {
                closeAllPickers();
            }
        };

        const handleClickOutsideMedia = (event) => {
            if (
                showMediaPicker &&
                mediaPickerRef.current &&
                !mediaPickerRef.current.contains(event.target) &&
                mediaButtonRef.current &&
                !mediaButtonRef.current.contains(event.target)
            ) {
                closeAllPickers();
            }
        };

        if (showEmojiPicker) {
            document.addEventListener("mousedown", handleClickOutsideEmoji);
            document.addEventListener("touchstart", handleClickOutsideEmoji);
        } else {
            document.removeEventListener("mousedown", handleClickOutsideEmoji);
            document.removeEventListener("touchstart", handleClickOutsideEmoji);
        }
        if (showMediaPicker) {
            document.addEventListener("mousedown", handleClickOutsideMedia);
            document.addEventListener("touchstart", handleClickOutsideMedia);
        } else {
            document.removeEventListener("mousedown", handleClickOutsideMedia);
            document.removeEventListener("touchstart", handleClickOutsideMedia);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutsideEmoji);
            document.removeEventListener("touchstart", handleClickOutsideEmoji);
            document.removeEventListener("mousedown", handleClickOutsideMedia);
            document.removeEventListener("touchstart", handleClickOutsideMedia);
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
                        ? `${GIPHY_SEARCH_STICKERS_URL}&q=${encodeURIComponent(mediaSearchTerm)}`
                        : GIPHY_TRENDING_STICKERS_URL;
                } else { // activeMediaType === 'gifs'
                    url = mediaSearchTerm.trim()
                        ? `${GIPHY_SEARCH_GIFS_URL}&q=${encodeURIComponent(mediaSearchTerm)}`
                        : GIPHY_TRENDING_GIFS_URL;
                }
                
                const response = await axios.get(url);
                setMediaItems(response.data.data);
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


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setText("");
        setImagePreview(null);
        setVideoPreview(null);
        closeAllPickers();

        setIsUploadingPreview(true);
        setUploadProgress(0);

        const reader = new FileReader();
        reader.onloadend = () => {
            if (file.type.startsWith("image/")) {
                setImagePreview(reader.result);
            } else if (file.type.startsWith("video/")) {
                setVideoPreview(reader.result);
            } else {
                toast.error("Please select an image or video file.");
                removeMedia();
                setIsUploadingPreview(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const removeMedia = () => {
        setImagePreview(null);
        setVideoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsUploadingPreview(false);
        setUploadProgress(0);
    };

    const handleSendMessage = async (e, payload = {}) => {
        if (e && e.preventDefault) e.preventDefault();

        const { text: msgText, image: imgUrl, video: vidUrl, sticker: stickerUrl, gif: gifUrl } = payload;

        if (!msgText && !imgUrl && !vidUrl && !stickerUrl && !gifUrl) return;
        if (!selectedUser?._id) {
            toast.error("Please select a user to chat with.");
            return;
        }

        const formData = new FormData();
        formData.append('receiverId', selectedUser._id);

        if (gifUrl) {
            formData.append('gif', gifUrl);
        } else if (stickerUrl) {
            formData.append('sticker', stickerUrl);
        } else if (imgUrl) {
            formData.append('image', imgUrl);
        } else if (vidUrl) {
            formData.append('video', vidUrl);
        } else {
            formData.append('text', msgText.trim());
        }

        if (!imagePreview && !videoPreview) {
             setIsUploadingPreview(true);
             setUploadProgress(0);
        }
        
        closeAllPickers();

        setIsSending(true);
        try {
            await axios.post(`/api/messages/send/${selectedUser._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setText("");
            setImagePreview(null);
            setVideoPreview(null);
            toast.success("Message sent!");

            if (getMessages) {
                await getMessages(selectedUser._id);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = error.response?.data?.error || "Failed to send message.";
            toast.error(errorMessage);
        } finally {
            setIsSending(false);
            setIsUploadingPreview(false);
            setUploadProgress(0);
        }
    };

    const handleEmojiSelect = (emoji) => {
        setText(prev => prev + emoji.native);
        closeAllPickers();
    };

    const handleMediaSelect = (mediaItem) => {
        let mediaUrl = mediaItem.images.fixed_height.url;

        if (activeMediaType === 'gifs') {
            handleSendMessage({ preventDefault: () => {} }, { gif: mediaUrl });
        } else {
            handleSendMessage({ preventDefault: () => {} }, { sticker: mediaUrl });
        }
    };

    const formBaseHeight = '4rem';
    const previewHeight = '6rem';

    return (
        <div 
            className={`p-2 flex-shrink-0 border-t border-base-200 bg-base-100 relative ${className} 
                        transition-all duration-300 ease-in-out`}
            style={{ height: (imagePreview || videoPreview) ? `calc(${previewHeight} + ${formBaseHeight})` : formBaseHeight }}
        >
            {/* Preview Section */}
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
                            {/* Progress Overlay */}
                            {isUploadingPreview && uploadProgress < 100 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                    <div
                                        className="radial-progress text-primary"
                                        style={{ "--value": uploadProgress, "--size": "3rem", "--thickness": "3px" }}
                                        role="progressbar"
                                        aria-valuenow={uploadProgress}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    >
                                        <span className="text-sm text-white">{uploadProgress}%</span>
                                    </div>
                                </div>
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
                            {fileInputRef.current?.files[0]?.name}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={(e) => handleSendMessage(e, { text: text })} 
                  className="flex-shrink-0 flex items-center gap-2 w-full px-2 py-2"
                  style={{ height: formBaseHeight }}
            >

                <div className="flex gap-1">
                    {/* Emoji Button */}
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

                    {/* Media Picker Button (for Stickers/GIFs) */}
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

                    {/* Media Attachment Button (for local files) */}
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
                    {/* The spinner is displayed based on isSending OR isUploadingPreview */}
                    {/* CRITICAL: Add pointer-events-auto to ensure the spinner is clickable */}
                    {isSending || isUploadingPreview ? 
                        <span className="loading loading-spinner text-white w-5 h-5 pointer-events-auto"></span> 
                        : <Send size={20} />}
                </button>
            </form>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+12px)] left-2 z-30">
                    <Picker data={data} onEmojiSelect={handleEmojiSelect} />
                </div>
            )}

            {/* Media Picker (Stickers/GIFs) */}
            {showMediaPicker && (
                <div
                    ref={mediaPickerRef}
                    className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2
                               w-80 max-h-80 overflow-y-auto z-30
                               bg-base-100/90 backdrop-blur-md border border-base-content/20 rounded-lg shadow-xl
                               p-3 flex flex-col gap-2"
                >
                    {/* Tabs for Stickers and GIFs */}
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

                    {/* Search Input for Media */}
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

                    {/* Media Items Display Grid */}
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