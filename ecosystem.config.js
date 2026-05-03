module.exports = {
  apps: [
    {
<<<<<<< HEAD
      name: "neron-vocal",
      script: "npm",
      args: "start",
      cwd: "./",
=======
      name: 'neron-vocal',
      script: 'node',
      args: 'server.js',
      cwd: '/etc/neron/client_vocal',
>>>>>>> release/v1.0.0
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
<<<<<<< HEAD
        NODE_ENV: "production",
        PROD: 3001,
      },
      out_file: "./logs/neron-out.log",
      error_file: "./logs/neron-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
=======
        NODE_ENV: 'production',
        NERON_CORE_URL: 'http://localhost:8010',
        NERON_STT_URL:  'http://localhost:8001',
      },
      out_file:   './logs/neron-out.log',
      error_file: './logs/neron-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
>>>>>>> release/v1.0.0
