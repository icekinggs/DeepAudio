import path from "node:path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { config, paths } from "../config/env.js";
import {
  allowedExtensions,
  isAllowedAudio,
} from "../constants/audio.js";

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, paths.original),
  filename: (request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const id = uuidv4();
    request.processingId = id;
    request.safeExtension = extension;
    callback(null, `${id}${extension}`);
  },
});

function fileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "audio"));
    return;
  }

  if (!isAllowedAudio(extension, file.mimetype)) {
    const error = new Error("INVALID_AUDIO_TYPE");
    error.code = "INVALID_AUDIO_TYPE";
    callback(error);
    return;
  }

  callback(null, true);
}

export const uploadAudio = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
}).single("audio");
