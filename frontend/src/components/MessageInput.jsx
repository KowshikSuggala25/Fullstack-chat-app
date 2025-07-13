import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, Smile, X, Video } from "lucide-react";
import toast from "react-hot-toast";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setVideoPreview(null);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please select an image or video file");
    }
  };

  const removeMedia = () => {
    setImagePreview(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !videoPreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        video: videoPreview,
      });

      setText("");
      removeMedia();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji.native);
  };

  return (
    <div className="p-4 w-full">
      {(imagePreview || videoPreview) && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Image Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            )}
            {videoPreview && (
              <video
                src={videoPreview}
                controls
                className="w-32 h-20 rounded-lg border border-zinc-700 object-cover"
              />
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-14 left-0 z-10">
            <Picker data={data} onEmojiSelect={handleEmojiSelect} />
          </div>
        )}

        <button
          type="button"
          className="p-2 rounded-full bg-white/30 backdrop-blur-md shadow-lg
            hover:bg-white/60 hover:scale-110 transition-all duration-300
            border border-white/40 text-primary"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${imagePreview || videoPreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
            title="Attach media"
          >
            <Image size={20} />
          </button>
        </div>

        <button
          type="submit"
          className="p-2 rounded-full bg-primary/70 backdrop-blur-md shadow-lg
            hover:bg-primary hover:scale-110 transition-all duration-300
            border border-white/40 text-white"
          disabled={!text.trim() && !imagePreview && !videoPreview}
          title="Send"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
