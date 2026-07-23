import { API_BASE_URL } from "../../../config/api";

const ACADEMY_URL = `${API_BASE_URL}/academy`;
const TASK_PROGRESS_URL = `${API_BASE_URL}/task-progress`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getCourses = async () => {
  const response = await fetch(`${ACADEMY_URL}/courses`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch courses");
  }

  return data;
};

export const getCourse = async (id) => {
  const response = await fetch(`${ACADEMY_URL}/courses/${id}/full`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch course");
  }

  return data;
};

export const getCourseProgress = async (courseId) => {
  if (!courseId) {
    throw new Error("Course ID is required");
  }

  const token = localStorage.getItem("token");

  const response = await fetch(`${TASK_PROGRESS_URL}/courses/${courseId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch course progress");
  }

  return data;
};

export const completeContentTask = async (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const token = localStorage.getItem("token");

  const response = await fetch(
    `${TASK_PROGRESS_URL}/tasks/${taskId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Failed to complete task");
  }

  return data;
};

export const startTask = async (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const token = localStorage.getItem("token");

  const response = await fetch(`${TASK_PROGRESS_URL}/tasks/${taskId}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Failed to start task");
  }

  return data;
};
