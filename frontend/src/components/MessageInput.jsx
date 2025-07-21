import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Mic, Smile, FileVideo } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import axios from "axios";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { useDebounce } from "../hooks/useDebounce"; // optional custom hook
import { useSocketContext } from "../context/SocketContext";

const gf = new GiphyFetch("KN8iK1DEZPWMuVguf5tzRtlsvxmJCLly");

export default function MessageInput() {
  const [text, setText] = useState("");
  const [gifSearch, setGifSearch] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const inputRef = useRef(null);

  const { selectedUser, setMessages, messages } = useChatStore();
  const { currentUser } = useAuthStore();
  const { socket } = useSocketContext();

  const debouncedSearch = useDebounce(gifSearch, 300);

  useEffect(() => {
    const fetchGIFs = async () => {
      if (debouncedSearch) {
        const res = await gf.search(debouncedSearch, { limit: 5 });
        setGifResults(res.data);
      } else {
        setGifResults([]);
      }
    };
    fetchGIFs();
  }, [debouncedSearch]);

  const handleSend = async () => {
    if (!text && !image && !video) return;

    const payload = {
      text,
      image,
      video,
    };

    try {
      const res = await axios.post(`/api/messages/send/${selectedUser._id}`, payload);
      setMessages([...messages, res.data]);
      socket.emit("newMessage", res.data);
      setText("");
      setImage(null);
      setVideo(null);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleGifClick = async (gifObj) => {
    const payload = {
      gif: gifObj.images.original.url,
    };
    try {
      const res = await axios.post(`/api/messages/send/${selectedUser._id}`, payload);
      setMessages([...messages, res.data]);
      socket.emit("newMessage", res.data);
      setGifSearch("");
      setGifResults([]);
    } catch (err) {
      console.error("GIF send failed", err);
    }
  };

  const handleEmojiClick = (e) => {
    setText((prev) => prev + e.emoji);
    setShowEmoji(false);
    inputRef.current.focus();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setVideo(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-t p-2 bg-white flex flex-col gap-2 relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-16 left-4 z-10">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme="light" />
        </div>
      )}

      {/* GIF search */}
      {gifResults.length > 0 && (
        <div className="absolute bottom-16 left-0 w-full bg-white border shadow-lg z-20 p-2 grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
          {gifResults.map((gif) => (
            <img
              key={gif.id}
              src={gif.images.fixed_height_small.url}
              alt={gif.title}
              className="cursor-pointer rounded"
              onClick={() => handleGifClick(gif)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setShowEmoji((s) => !s)}>
          <Smile className="text-gray-600" />
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-xl focus:outline-none"
        />
        <input
          type="text"
          placeholder="Search GIFs"
          value={gifSearch}
          onChange={(e) => setGifSearch(e.target.value)}
          className="w-32 px-2 py-1 border text-sm rounded-md"
        />
        <label className="cursor-pointer">
          <ImageIcon />
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </label>
        <label className="cursor-pointer">
          <FileVideo />
          <input type="file" accept="video/*" hidden onChange={handleVideoUpload} />
        </label>
        <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-full">
          <Send />
        </button>
      </div>

      {/* Optional Preview */}
      {(image || video) && (
        <div className="relative mt-2">
          {image && <img src={image} alt="preview" className="w-32 h-auto rounded-lg" />}
          {video && (
            <video src={video} controls className="w-48 rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
}
