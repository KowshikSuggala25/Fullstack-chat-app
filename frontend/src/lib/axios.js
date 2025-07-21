import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    window.location.hostname === "localhost"
      ? "http://localhost:10000/api"
      : "/api",
  withCredentials: true,
});
