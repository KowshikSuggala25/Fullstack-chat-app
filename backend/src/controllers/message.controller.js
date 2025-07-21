import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ✅ Get all users for sidebar (excluding logged-in user)
export const getUsersForSidebar = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Sidebar error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Fetch messages between 2 users
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const userToChatId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    for (let msg of messages) {
      await msg.populate({
        path: "reactions.userId",
        select: "fullName profilePic",
      });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send a message (text / image / video / sticker / gif)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video, sticker, gif } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl = null;
    let videoUrl = null;

    if (image) {
      const result = await cloudinary.uploader.upload(image);
      imageUrl = result.secure_url;
    }

    if (video) {
      const result = await cloudinary.uploader.upload(video, { resource_type: "video" });
      videoUrl = result.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || null,
      image: imageUrl,
      video: videoUrl,
      sticker: sticker || null,
      gif: gif || null,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "fullName username profilePic");
    await newMessage.populate("receiverId", "fullName username profilePic");

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ React to message
export const reactToMessage = async (req, res) => {
  const { id: messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingIndex !== -1) {
      const current = message.reactions[existingIndex];
      if (current.emoji === emoji) {
        message.reactions.splice(existingIndex, 1); // toggle off
      } else {
        message.reactions[existingIndex].emoji = emoji; // update
      }
    } else {
      message.reactions.push({ userId, emoji }); // add new
    }

    await message.save();
    await message.populate({
      path: "reactions.userId",
      select: "fullName profilePic",
    });

    res.status(200).json(message);
  } catch (err) {
    console.error("React error:", err);
    res.status(500).json({ error: "Failed to react" });
  }
};

// ✅ Delete message (soft delete)
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(200).json({ deleted: true });

    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (message.deleted) return res.status(200).json(message);

    message.text = null;
    message.image = null;
    message.video = null;
    message.sticker = null;
    message.gif = null;
    message.deleted = true;

    await message.save();
    await message.populate("senderId", "fullName username profilePic");
    await message.populate("receiverId", "fullName username profilePic");

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId, message });
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDeleted", { messageId, message });
    }

    res.status(200).json(message);
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
