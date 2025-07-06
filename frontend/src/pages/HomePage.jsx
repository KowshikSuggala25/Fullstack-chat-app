import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, isSidebarOpen, setIsSidebarOpen } = useChatStore();

  return (
    <div className="min-h-screen w-full bg-base-200 flex items-center justify-center px-4 py-4 overflow-hidden">
      <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl max-h-screen flex flex-col lg:flex-row overflow-hidden">
        
        {(isSidebarOpen || !selectedUser) && (
          <Sidebar />
        )}

        {selectedUser && (
          <ChatContainer onClose={() => setIsSidebarOpen(true)} />
        )}

        {!selectedUser && !isSidebarOpen && (
          <NoChatSelected />
        )}

      </div>
    </div>
  );
};

export default HomePage;
