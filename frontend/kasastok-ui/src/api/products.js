const API_BASE = "http://localhost:5256";

export async function getProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  return res.json();
}

export async function createProduct(data) {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProduct(id) {
  return fetch(`${API_BASE}/api/products/${id}`, {
    method: "DELETE"
  });
}

export async function updateProduct(id, data) {
  return fetch(`${API_BASE}/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
