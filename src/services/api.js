
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// ============================================================
// AUTHENTICATION TOKEN MANAGEMENT
// ============================================================

export const getToken = () => {
  return localStorage.getItem("access_token");
};

export const saveToken = (token) => {
  if (!token || typeof token !== "string") {
    throw new Error("A valid authentication token is required.");
  }

  localStorage.setItem("access_token", token);
};

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("portal_role");
};

// ============================================================
// SAFE ERROR MESSAGE NORMALIZATION
// ============================================================

const getErrorMessage = (detail) => {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const message =
          typeof item.msg === "string"
            ? item.msg
            : typeof item.message === "string"
              ? item.message
              : "Validation error";

        const location = Array.isArray(item.loc)
          ? item.loc
              .filter((part) => ["string", "number"].includes(typeof part))
              .join(" → ")
          : "";

        return location ? `${location}: ${message}` : message;
      }

      return "Invalid input";
    });

    return messages.join("; ");
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") {
      return detail.message;
    }

    if (typeof detail.msg === "string") {
      return detail.msg;
    }

    if (typeof detail.error === "string") {
      return detail.error;
    }

    return "The server returned an unexpected error.";
  }

  return "Something went wrong while communicating with the server.";
};

// ============================================================
// COMMON API REQUEST HANDLER
// ============================================================

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to the server. Check your internet connection and make sure the backend is running."
    );
  }

  let data = null;

  if (response.status !== 204) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = text ? { detail: text } : null;
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const message = getErrorMessage(data?.detail ?? data);

    if (response.status === 401) {
      throw new Error(
        message || "Your session has expired. Please log in again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        message || "You do not have permission to perform this action."
      );
    }

    if (response.status === 404) {
      throw new Error(message || "The requested resource was not found.");
    }

    throw new Error(message);
  }

  return data;
};

// ============================================================
// AUTHENTICATION
// ============================================================

export const loginUser = async (email, password) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
};

export const registerUser = async ({
  full_name,
  username,
  email,
  phone,
  password,
  confirm_password,
}) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name,
      username,
      email,
      phone,
      password,
      confirm_password,
    }),
  });
};

export const getCurrentUser = async () => {
  return apiRequest("/auth/me", {
    method: "GET",
  });
};

// ============================================================
// ONLINE SESSION MANAGEMENT
// ============================================================

export const sendHeartbeat = async () => {
  return apiRequest("/auth/heartbeat", {
    method: "POST",
  });
};

export const logoutUser = async () => {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
};

export const getOnlineUsersCount = async () => {
  return apiRequest("/admin/users/online-count", {
    method: "GET",
  });
};

// ============================================================
// ADMIN — USER MANAGEMENT
// ============================================================

export const getAllUsers = async () => {
  return apiRequest("/admin/users", {
    method: "GET",
  });
};

export const approveUser = async (userId) => {
  return apiRequest(`/admin/users/${userId}/approve`, {
    method: "POST",
  });
};

export const deleteUser = async (userId) => {
  return apiRequest(`/admin/users/${userId}`, {
    method: "DELETE",
  });
};

// ============================================================
// USER — PRICE ENTRIES
// ============================================================

export const createPriceEntry = async ({
  vegetable,
  price,
  unit,
  notes,
}) => {
  return apiRequest("/entries", {
    method: "POST",
    body: JSON.stringify({
      vegetable,
      price,
      unit,
      notes,
    }),
  });
};

export const getMyPriceEntries = async () => {
  return apiRequest("/entries/mine", {
    method: "GET",
  });
};

export const getMyPriceTrends = async (vegetable) => {
  const query = new URLSearchParams({ vegetable });

  return apiRequest(
    `/entries/mine/price-trends?${query.toString()}`,
    { method: "GET" }
  );
};

// ============================================================
// ADMIN — PRICE ENTRY HISTORY AND SUMMARY
// ============================================================

export const getEntrySummary = async () => {
  return apiRequest("/admin/entries/summary", {
    method: "GET",
  });
};

export const getUserPriceEntries = async (userId) => {
  return apiRequest(`/admin/users/${userId}/entries`, {
    method: "GET",
  });
};

// ============================================================
// VEGETABLE MANAGEMENT
// ============================================================

export const getActiveVegetables = async () => {
  return apiRequest("/vegetables", {
    method: "GET",
  });
};

export const getAllVegetables = async () => {
  return apiRequest("/admin/vegetables", {
    method: "GET",
  });
};

export const createVegetable = async ({ name, category, unit }) => {
  return apiRequest("/admin/vegetables", {
    method: "POST",
    body: JSON.stringify({
      name,
      category: category || null,
      unit,
    }),
  });
};

export const setVegetableActive = async (vegetableId, isActive) => {
  return apiRequest(
    `/admin/vegetables/${vegetableId}/status?is_active=${isActive}`,
    { method: "PATCH" }
  );
};

export const getVegetableTrends = async (vegetableId) => {
  return apiRequest(`/admin/vegetables/${vegetableId}/trends`, {
    method: "GET",
  });
};

// ============================================================
// ADMIN — COMPLETE PRICE ENTRY LOG
// ============================================================

export const getAllPriceEntries = async () => {
  return apiRequest("/admin/entries", {
    method: "GET",
  });
};

// ============================================================
// ADMIN — PRICE ANALYTICS
// ============================================================

export const getPriceAnalytics = async ({
  start_date = "",
  end_date = "",
  vegetable = "",
} = {}) => {
  const params = new URLSearchParams();

  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);
  if (vegetable) params.set("vegetable", vegetable);

  const query = params.toString();

  return apiRequest(
    `/admin/analytics${query ? `?${query}` : ""}`,
    { method: "GET" }
  );
};

// ============================================================
// PRICE CORRECTION REQUESTS
// ============================================================

export const createPriceCorrectionRequest = async (
  entryId,
  { proposed_price, proposed_notes, reason }
) => {
  return apiRequest(`/entries/${entryId}/correction-requests`, {
    method: "POST",
    body: JSON.stringify({
      proposed_price,
      proposed_notes,
      reason,
    }),
  });
};

export const getMyCorrectionRequests = async () => {
  return apiRequest("/entries/correction-requests/mine", {
    method: "GET",
  });
};

export const getCorrectionRequests = async (requestStatus = "pending") => {
  const query = requestStatus
    ? `?request_status=${encodeURIComponent(requestStatus)}`
    : "";

  return apiRequest(`/admin/correction-requests${query}`, {
    method: "GET",
  });
};

export const decideCorrectionRequest = async (
  requestId,
  decision,
  admin_note = ""
) => {
  return apiRequest(`/admin/correction-requests/${requestId}/decision`, {
    method: "PATCH",
    body: JSON.stringify({
      decision,
      admin_note,
    }),
  });
};

// ============================================================
// AI CHAT — ADMIN CHATBOT
// ============================================================

export const sendChatMessage = async (message) => {
  return apiRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

// ============================================================
// CUSTOMER SUBMISSIONS
// ============================================================

// Create a separate customer record for every submission.
// Uses POST /customers instead of updating an existing profile.

export const createCustomerSubmission = async (customer) => {
  return apiRequest("/customers", {
    method: "POST",
    body: JSON.stringify(customer),
  });
};

// ============================================================
// CUSTOMER PROFILE — EXISTING FUNCTIONALITY
// ============================================================

// Retrieve the logged-in user's saved customer profile.

export const getMyCustomerProfile = async () => {
  return apiRequest("/customers/me", {
    method: "GET",
  });
};

// Update the logged-in user's saved customer profile.
// Retained for compatibility with existing functionality.

export const saveMyCustomerProfile = async (profile) => {
  return apiRequest("/customers/me", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
};

// ============================================================
// ADMIN — CUSTOMER DIRECTORY
// ============================================================

// Retrieve all customer submissions and existing profiles.
// The backend is responsible for returning newest records first.

export const getAllCustomerProfiles = async () => {
  return apiRequest("/admin/customers", {
    method: "GET",
  });
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const getNotifications = () => {
  return apiRequest("/notifications", {
    method: "GET",
  });
};

export const getUnreadNotificationCount = () => {
  return apiRequest("/notifications/unread-count", {
    method: "GET",
  });
};

export const markNotificationRead = (notificationId) => {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "POST",
  });
};

export const markAllNotificationsRead = () => {
  return apiRequest("/notifications/read-all", {
    method: "POST",
  });
};
