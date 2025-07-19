// frontend/src/pages/HomePage.jsx
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    // This div is the main chat application block (Sidebar + ChatContainer).
    // It should now take h-full, as its parent in App.jsx is flex-1.
    <div
      className="flex h-full w-full max-w-6xl mx-auto my-4 rounded-lg overflow-hidden // Removed explicit height, added h-full
        bg-white/30 backdrop-blur-xl shadow-2xl border border-white/40
        ring-2 ring-white/20 transition-all duration-500"
    >
      <Sidebar />

      <div className="flex-1 h-full flex flex-col">
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};
export default HomePage;