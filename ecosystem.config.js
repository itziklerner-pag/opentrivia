module.exports = {
  apps: [
    {
      name: 'opentrivia-frontend',
      script: 'npm',
      args: 'start',
      cwd: './',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'opentrivia-socket',
      script: './socket/index.js',
      cwd: './',
      env: {
        PORT: 5505,
        NODE_ENV: 'production'
      }
    }
  ]
};