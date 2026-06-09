const API_BASE_URL = import.meta.env.VITE_API_URL || "";

async function parseResponse(response) {
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }

  const payload = await response.json().catch(() => ({}));
  throw new Error(payload.message || "Não foi possível concluir a solicitação.");
}

export function uploadAudio(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("audio", file);

    request.open("POST", `${API_BASE_URL}/api/audio/upload`);
    request.responseType = "json";

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

      reject(
        new Error(
          request.response?.message ||
            "Não foi possível enviar o arquivo de áudio.",
        ),
      );
    });

    request.addEventListener("error", () => {
      reject(new Error("Não foi possível conectar ao serviço."));
    });

    request.send(formData);
  });
}

export async function getStatus(id) {
  const response = await fetch(`${API_BASE_URL}/api/audio/status/${id}`);
  return parseResponse(response);
}

export function downloadUrl(path) {
  return `${API_BASE_URL}${path}`;
}
