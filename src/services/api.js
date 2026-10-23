const API_BASE_URL = "http://127.0.0.1:8000/api/v1";


// ============================================================
// GET STORED TOKEN
// ============================================================

export const getToken = () => {
  return localStorage.getItem("access_token");
};


// ============================================================
// STORE TOKEN
// ============================================================

export const saveToken = (token) => {
  localStorage.setItem("access_token", token);
};


// ============================================================
// REMOVE TOKEN / LOGOUT
// ============================================================

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("portal_role");
};


// ============================================================
// COMMON API REQUEST
// ============================================================

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      "Something went wrong while communicating with the server.";

    throw new Error(message);
  }

  return data;
};


// ============================================================
// LOGIN
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


// ============================================================
// REGISTER
// ============================================================

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


// ============================================================
// CURRENT USER
// ============================================================

export const getCurrentUser = async () => {
  return apiRequest("/auth/me", {
    method: "GET",
  });
};


// ============================================================
// ADMIN — GET ALL USERS
// ============================================================

export const getAllUsers = async () => {
  return apiRequest("/admin/users", {
    method: "GET",
  });
};


// ============================================================
// ADMIN — APPROVE USER
// ============================================================

export const approveUser = async (userId) => {
  return apiRequest(`/admin/users/${userId}/approve`, {
    method: "POST",
  });
};

// ============================================================
// ADMIN — REMOVE USER
// ============================================================

export const deleteUser = async (userId) => {
  return apiRequest(`/admin/users/${userId}`, {
    method: "DELETE",
  });
};


// ============================================================
// USER — PRICE ENTRIES
// ============================================================

export const createPriceEntry = async ({ vegetable, price, unit, notes }) => {
  return apiRequest("/entries", {
    method: "POST",
    body: JSON.stringify({ vegetable, price, unit, notes }),
  });
};

export const getMyPriceEntries = async () => {
  return apiRequest("/entries/mine", { method: "GET" });
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
  return apiRequest("/admin/entries/summary", { method: "GET" });
};

export const getUserPriceEntries = async (userId) => {
  return apiRequest(`/admin/users/${userId}/entries`, { method: "GET" });
};

// VEGETABLE MANAGEMENT — users can only list active vegetables; admin routes are protected server-side.
export const getActiveVegetables = async () => apiRequest("/vegetables", { method: "GET" });
export const getAllVegetables = async () => apiRequest("/admin/vegetables", { method: "GET" });
export const createVegetable = async ({ name, category, unit }) => apiRequest("/admin/vegetables", {
  method: "POST",
  body: JSON.stringify({ name, category: category || null, unit }),
});
export const setVegetableActive = async (vegetableId, isActive) => apiRequest(`/admin/vegetables/${vegetableId}/status?is_active=${isActive}`, { method: "PATCH" });
export const getVegetableTrends = async (vegetableId) => apiRequest(`/admin/vegetables/${vegetableId}/trends`, { method: "GET" });

// ADMIN — COMPLETE PRICE ENTRY LOG (includes history from removed users)
export const getAllPriceEntries = async () => apiRequest("/admin/entries", { method: "GET" });


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

/* PRICE CORRECTION REQUESTS */
export const createPriceCorrectionRequest = async (entryId, { proposed_price, proposed_notes, reason }) =>
  apiRequest(`/entries/${entryId}/correction-requests`, {
    method: "POST",
    body: JSON.stringify({ proposed_price, proposed_notes, reason }),
  });

export const getMyCorrectionRequests = async () =>
  apiRequest("/entries/correction-requests/mine", { method: "GET" });

export const getCorrectionRequests = async (requestStatus = "pending") => {
  const query = requestStatus ? `?request_status=${encodeURIComponent(requestStatus)}` : "";
  return apiRequest(`/admin/correction-requests${query}`, { method: "GET" });
};

export const decideCorrectionRequest = async (requestId, decision, admin_note = "") =>
  apiRequest(`/admin/correction-requests/${requestId}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ decision, admin_note }),
  });
// AI CHAT — ADMIN CHATBOT
export const sendChatMessage = async (message) => {
  return apiRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};
