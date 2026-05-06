// PM2 ecosystem file — used on the VPS to run the API server.
// Loaded automatically by `pm2 reload deploy/ecosystem.config.cjs --env production`.

module.exports = {
  apps: [
    {
      name: "nostress-api",
      script: "./dist/index.mjs",
      cwd: "/var/www/nostress-api/current",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      // Logs are written under shared/logs/ so they survive deployments.
      out_file: "/var/www/nostress-api/shared/logs/out.log",
      error_file: "/var/www/nostress-api/shared/logs/err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
