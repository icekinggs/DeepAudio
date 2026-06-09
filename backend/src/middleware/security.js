import { timingSafeEqual } from "node:crypto";
import { config } from "../config/env.js";

const uploadsByClient = new Map();

function tokenMatches(candidate, expected) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function requireAccessToken(request, response, next) {
  if (!config.accessToken) {
    next();
    return;
  }

  const authorization = request.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const token = bearer || request.get("x-deepaudio-token") || "";

  if (token && tokenMatches(token, config.accessToken)) {
    next();
    return;
  }

  response.status(401).json({
    message: "Informe o token de acesso para usar o DeepAudio.",
  });
}

export function uploadRateLimiter(request, response, next) {
  if (config.uploadRateLimitMax === 0) {
    next();
    return;
  }

  const now = Date.now();
  const client =
    request.ip ||
    request.get("cf-connecting-ip") ||
    request.get("x-forwarded-for") ||
    request.socket.remoteAddress ||
    "unknown";
  const current = uploadsByClient.get(client) || [];
  const recent = current.filter(
    (timestamp) => now - timestamp < config.uploadRateLimitWindowMs,
  );

  if (recent.length >= config.uploadRateLimitMax) {
    response.status(429).json({
      message: "Muitos uploads em pouco tempo. Tente novamente mais tarde.",
    });
    return;
  }

  recent.push(now);
  uploadsByClient.set(client, recent);
  next();
}
