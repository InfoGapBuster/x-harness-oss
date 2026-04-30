const { readFileSync } = require('fs');
const { join } = require('path');

const mcp = JSON.parse(readFileSync(join(__dirname, '.mcp.json'), 'utf8'));
const sharedEnv = mcp.mcpServers['x-harness-local'].env;

module.exports = {
  apps: [
    {
      name: 'x-harness-daemon',
      script: 'packages/mcp/dist/daemon.js',
      watch: false,
      autorestart: true,
      env: {
        ...sharedEnv,
        X_ACCOUNT_ID: '361f92fc-b201-473f-996a-bc2b22d2dd45',
      },
    },
  ],
};
