import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, ChevronLeft, ChevronRight, Search } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");

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

  // Fuzzy search filter
  const filteredUsers = users.filter((user) => {
    const isOnline = showOnlineOnly ? onlineUsers.includes(user._id) : true;
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return isOnline && matchesSearch;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside
      className={`
        h-full flex flex-col border-r border-base-300
        transition-all duration-300
        ${isOpen ? "w-64 sm:w-72" : "w-20"}
        overflow-hidden
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
          className="p-1 rounded transition
            hover:bg-white/30 hover:backdrop-blur-md hover:shadow-lg
            hover:scale-110 hover:border hover:border-white/40"
          title={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Fuzzy Search Bar */}
      {isOpen && (
        <div className="shrink-0 px-4 py-2 flex items-center gap-2 border-b border-base-300 relative">
          <Search className="size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-sm w-full pr-8"
          />
          {searchTerm && (
            <button
              className="absolute right-6 text-zinc-400 hover:text-red-500 text-lg"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              tabIndex={0}
            >
              ×
            </button>
          )}
        </div>
      )}

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
      <div className="flex-1 overflow-y-auto pt-2 pb-0 min-h-0" id="user-list-scroll"> {/* Changed py-3 to pt-2 pb-0 */}
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => {
              setSelectedUser(user);
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              }
            }}
            className={`
              w-full px-4 py-3 flex items-center gap-3
              transition-all duration-300 ease-in-out
              hover:bg-primary/10 hover:scale-[1.03] hover:shadow-lg
              ${selectedUser?._id === user._id
                ? "bg-primary/20 ring-2 ring-primary scale-[1.04] shadow-xl"
                : ""}
              rounded-xl
              group
            `}
            style={{ outline: "none" }}
          >
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full transition-all duration-300 group-hover:ring-2 group-hover:ring-primary"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>
            {isOpen && (
              <div className="text-left min-w-0 transition-all duration-300 group-hover:text-primary">
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
            No users found
          </div>
        )}

        {/* Top button */}
        <button
          className="w-10 h-10 flex items-center justify-center mx-auto mt-4 mb-0
            rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/40
            hover:bg-primary/30 hover:scale-110 transition-all duration-300"
          title="Scroll to top"
          onClick={() => {
            const list = document.getElementById("user-list-scroll");
            if (list) list.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;