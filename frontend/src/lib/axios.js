import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000", // backend URL, update for production
  withCredentials: true,
});

export default axiosInstance;
