import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const TOKEN_KEY = "insightai_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Broadcast auth failures so AuthContext can log the user out without
// every call site needing to catch a 401 individually.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("insightai:unauthorized"));
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export const api = {
  login: (username, password) => client.post("/login", { username, password }),

  register: (username, email, password) =>
    client.post("/register", { username, email, password }),

  googleLogin: (credential) => client.post("/auth/google", { credential }),

  getMe: () => client.get("/me"),

  updateAvatar: (dataUrl) => client.post("/me/avatar", { avatar: dataUrl }),

  removeAvatar: () => client.delete("/me/avatar"),

  uploadDataset: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return client.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
  },

  getHistory: (page = 1, limit = 10) =>
    client.get("/history", { params: { page, limit } }),

  getAnalytics: (fileId) => client.get(`/analytics/${fileId}`),

  generateInsights: (fileId) => client.post(`/generate-insights/${fileId}`),

  getCharts: (fileId) => client.get(`/charts/${fileId}`),

  deleteDataset: (fileId) => client.delete(`/dataset/${fileId}`),

  getDashboardStats: () => client.get("/dashboard-stats"),

  getReportUrl: (fileId) => {
    const token = tokenStore.get();
    // Backend streams a PDF FileResponse behind auth; we fetch it as a blob
    // so the Authorization header can be attached, then hand back an object URL.
    return client
      .get(`/report/${fileId}`, { responseType: "blob" })
      .then((res) => URL.createObjectURL(res.data));
  },
};

export { BASE_URL };
export default client;
