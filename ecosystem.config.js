module.exports = {
  apps: [{
    name: 'lms-api',
    script: './server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    
    // Environment-specific configurations
    env_production: {
      NODE_ENV: 'production',
      PORT: 8082,
      LOG_LEVEL: 'error'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 8082,
      LOG_LEVEL: 'info'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 8082,
      LOG_LEVEL: 'debug'
    },
    
    // Logging configuration
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Memory management
    max_memory_restart: '1G', // Restart if memory exceeds 1GB
    
    // Restart behavior
    autorestart: true, // Auto-restart on crash
    max_restarts: 10, // Max restarts within min_uptime
    min_uptime: '10s', // Minimum uptime before considered stable
    
    // Watch mode (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'tests'],
    
    // Advanced settings
    kill_timeout: 5000, // Time to wait before force kill
    listen_timeout: 3000, // Time to wait for app to listen
    shutdown_with_message: true,
    
    // Health monitoring
    instance_var: 'INSTANCE_ID',
  }]
};
