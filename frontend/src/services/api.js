const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const API_URL = API_BASE_URL;

export const toApiPath = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/\/api(?!\/v1)(\/|$)/, "/api/v1$1");
  }

  if (path.startsWith("/api/v1")) return path;
  if (path.startsWith("/api/")) return path.replace(/^\/api/, "/api/v1");
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
};

export const unwrapApiResponse = (payload) => {
  if (payload && payload.success === true && Object.hasOwn(payload, "data")) {
    return payload.data;
  }
  return payload;
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(toApiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return unwrapApiResponse(payload);
};

export const saveSimulationSnapshot = (snapshot) =>
  apiRequest("/simulation", {
    method: "POST",
    body: JSON.stringify(snapshot),
  });

export const getSimulationSnapshots = () => apiRequest("/simulation");
