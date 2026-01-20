#!/usr/bin/env node

/**
 * Cronos ParallelPay - Dry Run Demo (CI/Offline Mode)
 * 
 * This script validates the demo flow without requiring:
 * - Real blockchain transactions
 * - Facilitator connectivity
 * - Funded wallets
 * 
 * Perfect for CI and offline development.
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const SELLER_PORT = 3001;
const DASHBOARD_PORT = 3000;
const SELLER_URL = `http://localhost:${SELLER_PORT}`;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;
const MAX_HEALTH_RETRIES = 20;
const HEALTH_CHECK_INTERVAL = 1000;

let sellerProcess = null;
let dashboardProcess = null;

function printBanner(title) {
  const line = '='.repeat(60);
  console.log(`\n${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}\n`);
}

function printSection(title) {
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ ${title}${COLORS.reset}`);
}

function printSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function printError(message) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

function printInfo(message) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${message}`);
}

async function checkHealth(url) {
  try {
    const response = await fetch(`${url}/api/health`);
    if (response.ok) {
      const data = await response.json();
      return { ok: true, data };
    }
    return { ok: false };
  } catch (error) {
    return { ok: false };
  }
}

async function waitForHealthy(name, url, maxRetries = MAX_HEALTH_RETRIES) {
  printSection(`Waiting for ${name}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    const health = await checkHealth(url);
    if (health.ok) {
      printSuccess(`${name} is ready`);
      return { ok: true, data: health.data };
    }
    process.stdout.write('.');
    await sleep(HEALTH_CHECK_INTERVAL);
  }
  
  printError(`${name} timeout`);
  return { ok: false };
}

function startProcess(name, command, args) {
  return new Promise((resolve, reject) => {
    printSection(`Starting ${name}...`);
    
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        SELLER_ADDRESS: '0x0000000000000000000000000000000000000000'
      }
    });

    proc.stdout.on('data', (data) => {
      // Suppress most output in dry mode, but show errors
      const text = data.toString();
      if (text.includes('Error:') || text.includes('EADDRINUSE')) {
        console.log(`  ${text.trim()}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Error:') && !msg.includes('ECONNREFUSED')) {
        console.error(`  ${COLORS.red}${msg.trim()}${COLORS.reset}`);
      }
    });

    proc.on('error', (error) => {
      printError(`Failed: ${error.message}`);
      reject(error);
    });
    
    proc.on('exit', (code) => {
      // Don't treat as error during the initial wait period
    });

    setTimeout(() => {
      // After initial wait, check if process is still alive
      if (!proc.killed && proc.exitCode === null) {
        printSuccess(`${name} started`);
        resolve(proc);
      } else if (proc.exitCode === 0) {
        // Process exited cleanly but too soon
        printError(`${name} exited too early (code 0)`);
        reject(new Error(`${name} exited prematurely`));
      } else if (proc.exitCode !== null) {
        reject(new Error(`${name} failed with exit code ${proc.exitCode}`));
      } else {
        reject(new Error(`${name} failed`));
      }
    }, 3000);
  });
}

async function test402Response(url) {
  printSection('Testing 402 Response...');
  
  try {
    const response = await fetch(`${url}/api/premium-data`);
    
    if (response.status !== 402) {
      printError(`Expected 402, got ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    // Validate schema
    const required = ['schemaVersion', 'paymentRequired', 'amount', 'currency', 'recipient', 'chainId', 'facilitatorUrl'];
    const missing = required.filter(field => !(field in data));
    
    if (missing.length > 0) {
      printError(`Missing fields: ${missing.join(', ')}`);
      return false;
    }
    
    if (data.schemaVersion !== '1.0.0') {
      printError(`Invalid schemaVersion: ${data.schemaVersion}`);
      return false;
    }
    
    printSuccess('402 response valid');
    printSuccess(`  Schema: ${data.schemaVersion}`);
    printSuccess(`  Amount: ${data.amount} ${data.currency}`);
    printSuccess(`  Chain: ${data.chainId}`);
    
    return true;
  } catch (error) {
    printError(`402 test failed: ${error.message}`);
    return false;
  }
}

async function testHealthEndpoint(url) {
  printSection('Testing Health Endpoint...');
  
  try {
    const response = await fetch(`${url}/api/health`);
    
    if (!response.ok) {
      printError(`Health check failed: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    const required = ['status', 'service', 'chainId', 'facilitator'];
    const missing = required.filter(field => !(field in data));
    
    if (missing.length > 0) {
      printError(`Missing health fields: ${missing.join(', ')}`);
      return false;
    }
    
    printSuccess('Health endpoint valid');
    printSuccess(`  Status: ${data.status}`);
    printSuccess(`  Service: ${data.service}`);
    
    return true;
  } catch (error) {
    printError(`Health test failed: ${error.message}`);
    return false;
  }
}

async function cleanup() {
  printSection('Cleaning up...');
  
  const killProcess = (proc, name) => {
    if (proc && !proc.killed) {
      try {
        proc.kill('SIGTERM');
        printSuccess(`Stopped ${name}`);
      } catch (err) {
        // Already dead
      }
    }
  };

  killProcess(sellerProcess, 'Seller');
  killProcess(dashboardProcess, 'Dashboard');
  
  await sleep(1000);
}

async function main() {
  printBanner('Cronos ParallelPay - Dry Run (CI Mode)');
  
  printInfo('Testing without blockchain transactions');
  printInfo('Perfect for CI and offline development');
  console.log();

  let exitCode = 0;

  try {
    // Start services
    sellerProcess = await startProcess('Seller', 'npx', ['tsx', 'apps/seller-api/index.ts']);
    dashboardProcess = await startProcess('Dashboard', 'npx', ['tsx', 'dashboard/server.ts']);

    // Wait for health
    const sellerHealth = await waitForHealthy('Seller', SELLER_URL);
    const dashboardHealth = await waitForHealthy('Dashboard', DASHBOARD_URL);

    if (!sellerHealth.ok || !dashboardHealth.ok) {
      exitCode = 1;
      return;
    }

    // Run tests
    const healthOk = await testHealthEndpoint(SELLER_URL);
    const response402Ok = await test402Response(SELLER_URL);

    if (!healthOk || !response402Ok) {
      exitCode = 1;
    }

    // Final summary
    if (exitCode === 0) {
      printBanner('✓ DRY RUN SUCCESS');
      console.log(`${COLORS.green}All validation checks passed!${COLORS.reset}\n`);
    } else {
      printBanner('✗ DRY RUN FAILED');
      console.log(`${COLORS.red}See errors above${COLORS.reset}\n`);
    }

  } catch (error) {
    printError(`Error: ${error.message}`);
    exitCode = 1;
  } finally {
    await cleanup();
  }

  process.exit(exitCode);
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(143);
});

main().catch((error) => {
  console.error('Fatal:', error);
  cleanup().finally(() => process.exit(1));
});
