module.exports = {
  apps: [
    {
      name: 'neron-vocal',
      script: 'npx',
      args: 'next start',
      cwd: './',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PROD: 3001,
        NERON_CORE_URL: 'http://localhost:8000',
        NERON_STT_URL:  'http://localhost:8001',
      },
      out_file:   './logs/neron-out.log',
      error_file: './logs/neron-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
