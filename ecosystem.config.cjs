const port = process.env.PORT || "3000";
const appName = process.env.PM2_APP_NAME || "chihiro";

module.exports = {
  apps: [
    {
      name: appName,
      cwd: process.env.APP_DIR || __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start -H 0.0.0.0 -p ${port}`,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.PM2_MAX_MEMORY || "500M",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
