import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import DatauriParser from "datauri/parser.js";
import path from "path";

export const getUsersForSidebar = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Sidebar error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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

export const sendMessage = async (req, res) => {
  try {
    const { text, sticker, gif } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let mediaUrl = null;
    let resourceType = 'text';

    if (req.file) {
      const parser = new DatauriParser();
      
      const fileData = parser.format(path.extname(req.file.originalname).toString(), req.file.buffer);

      const uploadOptions = {};
      
      if (req.file.mimetype.startsWith('video/')) {
        uploadOptions.resource_type = 'video';
        resourceType = 'video';
      } else if (req.file.mimetype.startsWith('image/')) {
        uploadOptions.resource_type = 'image';
        resourceType = 'image';
      }

      try {
        const result = await cloudinary.uploader.upload(fileData.content, uploadOptions);
        if (result && result.secure_url) {
          mediaUrl = result.secure_url;
        } else {
          console.error("Cloudinary upload failed: secure_url not found in result");
          return res.status(500).json({ error: "Failed to upload media to Cloudinary." });
        }
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({ error: "Failed to upload media to Cloudinary.", details: uploadError.message });
      }
    }

    if (!text && !mediaUrl && !sticker && !gif) {
      return res.status(400).json({ error: "Message must have content." });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || null,
      image: resourceType === 'image' ? mediaUrl : null,
      video: resourceType === 'video' ? mediaUrl : null,
      sticker: sticker || null,
      gif: gif || null,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName username profilePic")
      .populate("receiverId", "fullName username profilePic")
      .populate({
        path: "reactions.userId",
        select: "fullName profilePic",
      });

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    
    if (senderSocketId && senderSocketId !== receiverSocketId) { // ✅ FIX: Broadcast message to the sender's own socket if they have multiple tabs open
      io.to(senderSocketId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    await message.populate({
      path: "reactions.userId",
      select: "fullName profilePic",
    });

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);
    
    const reactionData = {
      messageId: message._id,
      reactions: message.reactions
    };
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReacted", reactionData);
    }
    
    if (senderSocketId && senderSocketId !== receiverSocketId) { // ✅ FIX: Check to avoid sending to the same socket twice
      io.to(senderSocketId).emit("messageReacted", reactionData);
    }
    res.status(200).json(message);
  } catch (err) {
    console.error("React error:", err);
    res.status(500).json({ error: "Failed to react" });
  }
};

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

    // 🔴 Change: Set the `deleted` flag to true, but do not clear the content here.
    message.deleted = true;

    await message.save();
    await message.populate("senderId", "fullName username profilePic");
    await message.populate("receiverId", "fullName username profilePic");

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);

    // ✅ FIX: Only emit the messageId to the client to update the UI
    const dataToEmit = { messageId: message._id };
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", dataToEmit);
    }
    if (senderSocketId && senderSocketId !== receiverSocketId) { // ✅ FIX: Check to avoid sending to the same socket twice
      io.to(senderSocketId).emit("messageDeleted", dataToEmit);
    }

    res.status(200).json(message);
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};