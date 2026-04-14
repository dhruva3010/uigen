#!/usr/bin/env node

// Require the node compatibility shim first
require('./node-compat.cjs');

// Import and run Next.js dev server
const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');
const child = spawn(nextBin, ['dev', '--turbopack'], {
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('exit', (code) => {
  process.exit(code);
});
