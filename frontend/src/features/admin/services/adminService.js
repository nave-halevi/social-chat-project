import { API_BASE_URL } from "../../../config/api";

const ADMIN_URL = `${API_BASE_URL}/admin`;
const ACADEMY_URL = `${API_BASE_URL}/academy/admin`;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

const withQuery = (url, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
};

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: headers() });
  if (response.status === 204 || (response.status === 200 && options.method === "DELETE")) {
    return null;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export const getAdminDashboard = () => request(`${ADMIN_URL}/dashboard`);

export const getAdminUsers = (params) => request(withQuery(`${ADMIN_URL}/users`, params));
export const getAdminUserDetails = (id) => request(`${ADMIN_URL}/users/${id}`);
export const updateAdminUserStatus = (id, body) =>
  request(`${ADMIN_URL}/users/${id}/status`, { method: "PUT", body: JSON.stringify(body) });
export const updateAdminUserRole = (id, body) =>
  request(`${ADMIN_URL}/users/${id}/role`, { method: "PUT", body: JSON.stringify(body) });
export const resetAdminUserPassword = (id, body) =>
  request(`${ADMIN_URL}/users/${id}/password`, { method: "PUT", body: JSON.stringify(body) });

export const getAdminLabs = (params) => request(withQuery(`${ADMIN_URL}/labs`, params));
export const terminateAdminLab = (id) =>
  request(`${ADMIN_URL}/labs/${id}/terminate`, { method: "POST" });

export const getAdminFlags = (params) => request(withQuery(`${ADMIN_URL}/flags`, params));
export const getAdminFlag = (id) => request(`${ADMIN_URL}/flags/${id}`);
export const createAdminFlag = (body) =>
  request(`${ADMIN_URL}/flags`, { method: "POST", body: JSON.stringify(body) });
export const updateAdminFlag = (id, body) =>
  request(`${ADMIN_URL}/flags/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteAdminFlag = (id) => request(`${ADMIN_URL}/flags/${id}`, { method: "DELETE" });

export const getAdminActivity = (params) => request(withQuery(`${ADMIN_URL}/activity`, params));

export const getAdminScenarios = () => request(`${ADMIN_URL}/scenarios`);
export const createScenario = (body) =>
  request(`${ADMIN_URL}/scenarios`, { method: "POST", body: JSON.stringify(body) });
export const updateScenario = (id, body) =>
  request(`${ADMIN_URL}/scenarios/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteScenario = (id) => request(`${ADMIN_URL}/scenarios/${id}`, { method: "DELETE" });

export const getAdminCourses = () => request(`${ACADEMY_URL}/courses`);
export const createCourse = (body) =>
  request(`${ACADEMY_URL}/courses`, { method: "POST", body: JSON.stringify(body) });
export const updateCourse = (id, body) =>
  request(`${ACADEMY_URL}/courses/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteCourse = (id) => request(`${ACADEMY_URL}/courses/${id}`, { method: "DELETE" });
export const getSectionsByCourse = (id) => request(`${ACADEMY_URL}/courses/${id}/sections`);
export const createSection = (body) =>
  request(`${ACADEMY_URL}/sections`, { method: "POST", body: JSON.stringify(body) });
export const updateSection = (id, body) =>
  request(`${ACADEMY_URL}/sections/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteSection = (id) => request(`${ACADEMY_URL}/sections/${id}`, { method: "DELETE" });
export const getTasksBySection = (id) => request(`${ACADEMY_URL}/sections/${id}/tasks`);
export const createTask = (body) =>
  request(`${ACADEMY_URL}/tasks`, { method: "POST", body: JSON.stringify(body) });
export const updateTask = (id, body) =>
  request(`${ACADEMY_URL}/tasks/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteTask = (id) => request(`${ACADEMY_URL}/tasks/${id}`, { method: "DELETE" });
