const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "deepaudio_access_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse(response) {
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }

  const payload = await response.json().catch(() => ({}));
  const error = new Error(payload.message || "Nao foi possivel concluir a solicitacao.");
  error.status = response.status;
  throw error;
}

export function uploadAudio(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("audio", file);

    request.open("POST", `${API_BASE_URL}/api/audio/upload`);
    request.responseType = "json";

    const token = getAccessToken();
    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
        return;
      }

      const error = new Error(
        request.response?.message || "Nao foi possivel enviar o arquivo de audio.",
      );
      error.status = request.status;
      reject(error);
    });

    request.addEventListener("error", () => {
      reject(new Error("Nao foi possivel conectar ao servico."));
    });

    request.send(formData);
  });
}

export async function getStatus(id) {
  const response = await fetch(`${API_BASE_URL}/api/audio/status/${id}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/api/audio/history`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function deleteJob(id) {
  const response = await fetch(`${API_BASE_URL}/api/audio/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function cleanupJobs() {
  const response = await fetch(`${API_BASE_URL}/api/audio/cleanup`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function getAdminSummary() {
  const response = await fetch(`${API_BASE_URL}/api/audio/admin/summary`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export function downloadUrl(path) {
  return `${API_BASE_URL}${path}`;
}
