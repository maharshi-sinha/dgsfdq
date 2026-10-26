import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.response.use((response) => {
  const ct = String(response.headers["content-type"] ?? "");
  if (ct.includes("text/html")) {
    return Promise.reject(new axios.AxiosError("Expected JSON, got HTML", "ERR_BAD_RESPONSE", response.config, response.request, response));
  }
  return response;
});
