import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen w-full bg-base-200 overflow-hidden">
      <div className="flex h-full max-w-7xl mx-auto bg-base-100 rounded-lg shadow-lg overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {selectedUser ? <ChatContainer /> : <NoChatSelected />}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
