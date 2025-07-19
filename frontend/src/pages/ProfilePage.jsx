import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Pencil, X, Check } from "lucide-react";
import { toast } from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleEdit = (field) => {
    setEditingField(field);
    setEditValue(authUser[field] || "");
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      toast.error("Field cannot be empty!");
      return;
    }

    try {
      await updateProfile({ [editingField]: editValue.trim() });
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setEditingField(null);
      setEditValue("");
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
  };

  return (
    <div className="h-screen pt-20 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
                {!editingField && (
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-white/30 transition"
                    onClick={() => handleEdit("fullName")}
                    title="Edit Name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingField === "fullName" ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button
                    className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition"
                    onClick={handleSave}
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                    onClick={handleCancel}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
                {!editingField && (
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-white/30 transition"
                    onClick={() => handleEdit("email")}
                    title="Edit Email"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingField === "email" ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button
                    className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition"
                    onClick={handleSave}
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                    onClick={handleCancel}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.email}</p>
              )}
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser?.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
