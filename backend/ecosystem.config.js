module.exports = {
  apps: [
    {
      name: "bladesmith",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "350M",
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      max_restarts: 15,
      restart_delay: 1000,
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        LOG_LEVEL: "info"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5000,
        LOG_LEVEL: "debug"
      },
      node_args: "--max-old-space-size=320",
      error_file: "../logs/err.log",
      out_file: "../logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
