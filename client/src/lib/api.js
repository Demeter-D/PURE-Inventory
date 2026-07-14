const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  me: () => request("/auth/me"),
  login: (userId, passcode) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ userId, passcode }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  collaborators: () => request("/collaborators"),
  listProducts: () => request("/products"),
  createProduct: (category) =>
    request("/products", { method: "POST", body: JSON.stringify({ category }) }),
  updateProduct: (id, fields) =>
    request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
};
