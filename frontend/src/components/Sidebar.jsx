import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    setIsSidebarOpen,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Set initial open state based on screen size
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside
      className={`
        h-full flex flex-col border-r border-base-300
        transition-all duration-300
        ${isOpen ? "w-64 sm:w-72" : "w-20"}
      `}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-base-300 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          {isOpen && <span className="font-medium">Contacts</span>}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded hover:bg-base-200 transition"
          title={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Online filter */}
      {isOpen && (
        <div className="shrink-0 border-b border-base-300 px-4 py-2 flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => {
              setSelectedUser(user);
              setIsSidebarOpen(false);
            }}
            className={`
              w-full px-4 py-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>
            {isOpen && (
              <div className="text-left min-w-0">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            )}
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">
            No online users
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
