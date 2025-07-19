import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ✅ Get sidebar users (all except logged-in user)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
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

    // Populate reactions' user data for frontend display
    for (let i = 0; i < messages.length; i++) {
        await messages[i].populate({
            path: 'reactions.userId',
            select: 'fullName profilePic',
        });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send a message (supports text + image + video + sticker + gif)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video, sticker, gif } = req.body; // <-- Destructure 'gif'
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl = null;
    let videoUrl = null;
    let stickerUrl = null;
    let gifUrl = null; // Variable for GIF URL

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

    if (sticker) {
        stickerUrl = sticker;
    }

    if (gif) { // Handle GIF URL
        gifUrl = gif;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || null,
      image: imageUrl || null,
      video: videoUrl || null,
      sticker: stickerUrl || null,
      gif: gifUrl || null, // <-- Assign new GIF field
    });

    await newMessage.save();

    await newMessage.populate('senderId', 'fullName username profilePic');
    await newMessage.populate('receiverId', 'fullName username profilePic');

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

export const reactToMessage = async (req, res) => {
  const { id: messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);

    if (!message) return res.status(404).json({ message: "Message not found" });

    const userReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (userReactionIndex !== -1) {
      const existingReaction = message.reactions[userReactionIndex];

      if (existingReaction.emoji === emoji) {
        message.reactions.splice(userReactionIndex, 1);
      } else {
        message.reactions[userReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    await message.populate({
        path: 'reactions.userId',
        select: 'fullName profilePic',
    });

    res.status(200).json(message);
  } catch (err) {
    console.error("Error in reactToMessage:", err);
    res.status(500).json({ message: "Failed to react", error: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(200).json({ deleted: true });
    }

    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ error: "Not authorized to delete this message" });
    }

    if (message.deleted) {
      return res.status(200).json(message);
    }

    message.text = null;
    message.image = null;
    message.video = null;
    message.sticker = null;
    message.gif = null; // <-- Also clear GIF field on delete
    message.deleted = true;
    await message.save();

    await message.populate('senderId', 'fullName username profilePic');
    await message.populate('receiverId', 'fullName username profilePic');

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
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};