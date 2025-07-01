import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ✅ Get sidebar users (all except logged-in user)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get messages between logged-in user and selected user
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

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send a message (supports text + image)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl = null;
    let videoUrl = null;
    
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    
    if (video) {
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
      });
      videoUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    // Notify receiver in real-time
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Only sender can delete
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await message.deleteOne();
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
