import { API_BASE_URL } from "../../../config/api";

const BASE_URL = `${API_BASE_URL}/profile`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

async function parseResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return data;
}

export async function getProfile() {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function updateProfile({ user_name, email, avatar_url }) {
  const response = await fetch(BASE_URL, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_name, email, avatar_url }),
  });

  return parseResponse(response);
}

export async function changePassword({
  current_password,
  new_password,
  confirm_password,
}) {
  const response = await fetch(`${BASE_URL}/password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      current_password,
      new_password,
      confirm_password,
    }),
  });

  return parseResponse(response);
}

export async function updateAvatar(avatar_url) {
  const response = await fetch(`${BASE_URL}/avatar`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ avatar_url }),
  });

  return parseResponse(response);
}
