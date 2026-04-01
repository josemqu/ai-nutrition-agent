module.exports = {
  apps: [
    {
      name: 'ai-nutrition-agent',
      cwd: './frontend',
      script: 'npm',
      args: 'run start -- -p 3005',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
