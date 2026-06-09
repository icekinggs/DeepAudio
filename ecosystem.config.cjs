module.exports = {
  apps: [
    {
      name: "deepaudio",
      script: "./backend/src/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      time: true,
      error_file: "./storage/logs/pm2-error.log",
      out_file: "./storage/logs/pm2-out.log",
      merge_logs: true,
    },
  ],
};
