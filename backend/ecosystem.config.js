module.exports = {
  apps: [
    {
      name: 'nansai-backend',
      script: './server.js',

      // ── Cluster mode: one worker per CPU core ──
      exec_mode: 'cluster',
      instances: 'max',

      // ── Auto-restart on crash ──
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,

      // ── Restart worker if it leaks past 400MB ──
      max_memory_restart: '400M',

      // ── Wait for process.send('ready') before routing traffic ──
      wait_ready: true,
      listen_timeout: 10000,

      // ── Graceful shutdown: give workers 15s to drain ──
      kill_timeout: 15000,
      shutdown_with_message: true,

      // ── Logs (directory created by build command in render.yaml) ──
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Environments ──
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
    },
  ],
};
