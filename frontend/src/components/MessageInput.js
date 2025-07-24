import { useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const MessageInput = ({ selectedUser }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) {
      toast.error("Please select a user to chat with.");
      return;
    }
    if (!text && !file) return;
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);
    setIsSending(true);
    try {
      await axios.post(`/api/messages/send/${selectedUser._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8 }}>
      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit" disabled={isSending || (!text && !file)}>
        {isSending ? "Sending..." : "Send"}
      </button>
    </form>
  );
};

export default MessageInput;