export const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  return "https://white-board-tool-backend.onrender.com";
};

export const getWsUrl = (boardId, token = "") => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    const base = import.meta.env.VITE_WS_BASE_URL.replace(/\/$/, "");
    return `${base}/ws/whiteboard/${boardId}/?token=${token}`;
  }
  const backendUrl = getBackendUrl();
  const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";
  const wsHost = backendUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${wsProtocol}://${wsHost}/ws/whiteboard/${boardId}/?token=${token}`;
};

export default getBackendUrl();
