import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers, logout } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth().catch((err) => {
      console.error("Auth check failed:", err);
    });
  }, []); // run once on mount

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    // Main App container: Takes full viewport height and arranges content vertically
    <div data-theme={theme} className="flex flex-col h-screen overflow-hidden"> {/* Added flex flex-col h-screen overflow-hidden */}
      {/* Header Section: Navbar + Logout Button */}
      {/* This section takes its natural height (shrink-0) */}
      <div className="flex-shrink-0">
        <Navbar />
        {authUser && (
          <div className="flex justify-end p-4 bg-base-100"> {/* Added bg-base-100 to ensure background */}
            <button
              className="btn btn-error"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Takes all remaining vertical space and is scrollable if needed */}
      {/* This is where your HomePage (and other pages) will live */}
      <div className="flex-1 overflow-y-auto"> {/* flex-1 to take remaining height, overflow-y-auto for content */}
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
        </Routes>
      </div>

      <Toaster />
    </div>
  );
};

export default App;