import { API_BASE_URL, getWebSocketOrigin } from "../../../config/api";

const BASE_URL = `${API_BASE_URL}/lab`;

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
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export async function createLab(scenarioId) {
  if (!scenarioId) {
    throw new Error("Scenario ID is required to create a lab.");
  }

  const response = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      scenario_id: scenarioId,
    }),
  });

  return parseResponse(response);
}

export async function deleteLab(environmentId) {
  if (!environmentId) {
    throw new Error("Environment ID is required to delete a lab.");
  }

  const response = await fetch(`${BASE_URL}/delete`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      env_id: environmentId,
    }),
  });

  return parseResponse(response);
}

export async function getActiveLab(scenarioId) {
  if (!scenarioId) {
    return null;
  }

  const response = await fetch(`${BASE_URL}/active/${scenarioId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getAnyActiveLab() {
  const response = await fetch(`${BASE_URL}/active`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getLabStatus(environmentId) {
  if (!environmentId) {
    return null;
  }

  const response = await fetch(`${BASE_URL}/status/${environmentId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function submitLabFlag(environmentId, taskId, flagValue) {
  if (!environmentId) {
    throw new Error("Start the lab machine before submitting a flag.");
  }

  if (!taskId) {
    throw new Error("Task ID is required to complete the lab.");
  }

  if (!flagValue?.trim()) {
    throw new Error("Flag value is required.");
  }

  const response = await fetch(`${BASE_URL}/submit`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      env_id: environmentId,
      task_id: taskId,
      flag: flagValue.trim(),
    }),
  });

  return parseResponse(response);
}

export function getTerminalUrl(environmentId) {
  if (!environmentId) {
    throw new Error("Environment ID is required for a terminal connection.");
  }

  const websocketOrigin = getWebSocketOrigin();
  const token = encodeURIComponent(localStorage.getItem("token") || "");

  return `${websocketOrigin}/api/lab/terminal/${environmentId}?token=${token}`;
}
