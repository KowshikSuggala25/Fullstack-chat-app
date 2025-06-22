import axios from "axios";

// Axios instance
export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:5000/api"
    : "/api",
  withCredentials: true,
});

// Optional: helper function to fetch users (but not called automatically)
export const fetchUsers = async () => {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const res = await axios.get("/api/messages/users", config);
    return res.data;
  } catch (error) {
    throw error;
  }
};
