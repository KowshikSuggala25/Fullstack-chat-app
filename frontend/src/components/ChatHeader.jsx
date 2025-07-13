import { useState } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div
              className="size-10 rounded-full relative cursor-pointer transition hover:scale-105"
              onClick={() => setShowInfo(true)}
              title="View user info"
            >
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info (clickable username) */}
          <div>
            <h3
              className="font-medium cursor-pointer transition
    hover:text-primary hover:scale-105"
              onClick={() => setShowInfo(true)}
              title="View user info"
            >
              {selectedUser.fullName}
            </h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 rounded-full bg-white/30 backdrop-blur-md shadow-lg
    hover:bg-white/60 hover:scale-110 transition-all duration-300
    border border-white/40 text-zinc-700"
          title="Close chat"
        >
          <X />
        </button>
      </div>

      {/* User Info Modal */}
      {showInfo && (
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
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="size-16 rounded-full border"
              />
              <h2 className="font-bold text-lg">{selectedUser.fullName}</h2>
              <p className="text-sm text-zinc-500">{selectedUser.email}</p>
              <p className="text-sm text-zinc-500">
                Status: {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
              {/* Add more user info fields here if needed */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
