#!/usr/bin/env node

/**
 * Cronox ParallelPay - One-Command Demo Orchestrator
 * 
 * This script provides a bulletproof, cinematic demo experience:
 * 1. Starts seller API + dashboard
 * 2. Polls /health until ready
 * 3. Runs buyer agent once
 * 4. Prints formatted output with success banner
 * 5. Exits with proper status codes
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
const MAX_HEALTH_RETRIES = 30; // 30 seconds
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

let sellerProcess = null;
let dashboardProcess = null;
let buyerProcess = null;

/**
 * Print banner
 */
function printBanner(title) {
  const line = '='.repeat(60);
  console.log(`\n${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}\n`);
}

/**
 * Print section header
 */
function printSection(title) {
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ ${title}${COLORS.reset}`);
}

/**
 * Print success message
 */
function printSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

/**
 * Print error message
 */
function printError(message) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

/**
 * Print info message
 */
function printInfo(message) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${message}`);
}

/**
 * Check if a service is healthy
 */
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

/**
 * Poll health endpoint until ready
 */
async function waitForHealthy(name, url, maxRetries = MAX_HEALTH_RETRIES) {
  printSection(`Waiting for ${name} to be ready...`);
  
  for (let i = 0; i < maxRetries; i++) {
    const health = await checkHealth(url);
    if (health.ok) {
      printSuccess(`${name} is ready!`);
      if (health.data) {
        printInfo(`  Service: ${health.data.service || health.data.name || 'Unknown'}`);
        printInfo(`  Network: ${health.data.network || health.data.chainId || 'N/A'}`);
      }
      return true;
    }
    process.stdout.write('.');
    await sleep(HEALTH_CHECK_INTERVAL);
  }
  
  printError(`${name} failed to start within ${maxRetries} seconds`);
  return false;
}

/**
 * Start a process
 */
function startProcess(name, command, args, color = COLORS.cyan) {
  return new Promise((resolve, reject) => {
    printSection(`Starting ${name}...`);
    
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Capture output for debugging
    let output = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
      // Only show critical startup messages
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('Server:') || line.includes('Dashboard:') || line.includes('running')) {
          console.log(`  ${color}${line.trim()}${COLORS.reset}`);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      // Only show actual errors, not warnings
      if (msg.includes('Error:') || msg.includes('EADDRINUSE')) {
        console.error(`  ${COLORS.red}${msg.trim()}${COLORS.reset}`);
      }
    });

    proc.on('error', (error) => {
      printError(`Failed to start ${name}: ${error.message}`);
      reject(error);
    });

    // Give it a moment to start
    setTimeout(() => {
      if (proc.exitCode === null) {
        printSuccess(`${name} process started`);
        resolve(proc);
      } else {
        printError(`${name} exited immediately with code ${proc.exitCode}`);
        reject(new Error(`${name} failed to start`));
      }
    }, 3000);
  });
}

/**
 * Run buyer agent and capture results
 */
async function runBuyerAgent() {
  return new Promise((resolve) => {
    printSection('Running Buyer Agent...');
    
    const proc = spawn('npx', ['tsx', 'apps/buyer-agent/index.ts'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';
    let captured402 = false;
    let capturedSettlement = false;
    let txHash = null;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Print buyer agent output
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          // Highlight key events
          if (line.includes('402 Payment Required')) {
            captured402 = true;
            console.log(`  ${COLORS.yellow}${line.trim()}${COLORS.reset}`);
          } else if (line.includes('Payment successful') || line.includes('settled')) {
            capturedSettlement = true;
            console.log(`  ${COLORS.green}${line.trim()}${COLORS.reset}`);
          } else if (line.includes('TxHash:')) {
            const match = line.match(/0x[a-fA-F0-9]{64}/);
            if (match) {
              txHash = match[0];
            }
            console.log(`  ${COLORS.bright}${COLORS.green}${line.trim()}${COLORS.reset}`);
          } else if (line.includes('Explorer:')) {
            console.log(`  ${COLORS.cyan}${line.trim()}${COLORS.reset}`);
          } else {
            console.log(`  ${line.trim()}`);
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        code,
        output,
        errorOutput,
        captured402,
        capturedSettlement,
        txHash,
      });
    });
  });
}

/**
 * Cleanup processes
 */
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

  killProcess(buyerProcess, 'Buyer Agent');
  killProcess(sellerProcess, 'Seller API');
  killProcess(dashboardProcess, 'Dashboard');
  
  await sleep(1000);
}

/**
 * Main demo flow
 */
async function main() {
  printBanner('Cronox ParallelPay - Judge Mode Demo');
  
  printInfo(`Seller URL:    ${SELLER_URL}`);
  printInfo(`Dashboard URL: ${DASHBOARD_URL}`);
  console.log();

  let exitCode = 0;

  try {
    // Step 1: Start seller API
    sellerProcess = await startProcess(
      'Seller API',
      'npx',
      ['tsx', 'apps/seller-api/index.ts'],
      COLORS.blue
    );

    // Step 2: Start dashboard
    dashboardProcess = await startProcess(
      'Dashboard',
      'npx',
      ['tsx', 'dashboard/server.ts'],
      COLORS.cyan
    );

    // Step 3: Wait for services to be healthy
    const sellerReady = await waitForHealthy('Seller API', SELLER_URL);
    if (!sellerReady) {
      printError('Seller API failed to become healthy');
      exitCode = 1;
      return;
    }

    const dashboardReady = await waitForHealthy('Dashboard', DASHBOARD_URL);
    if (!dashboardReady) {
      printError('Dashboard failed to become healthy');
      exitCode = 1;
      return;
    }

    // Step 4: Run buyer agent
    const result = await runBuyerAgent();

    // Step 5: Validate results
    printSection('Validating Demo Results...');
    
    if (!result.captured402) {
      printError('Did not receive HTTP 402 response');
      exitCode = 1;
    } else {
      printSuccess('Received HTTP 402 Payment Required');
    }

    if (!result.capturedSettlement) {
      printError('Payment settlement failed');
      exitCode = 1;
    } else {
      printSuccess('Payment settled successfully');
    }

    if (!result.txHash) {
      printError('No transaction hash received');
      exitCode = 1;
    } else {
      printSuccess(`Settlement txHash: ${result.txHash}`);
    }

    // Step 6: Print final banner
    if (exitCode === 0) {
      printBanner('✓ DEMO SUCCESS - All Checks Passed!');
      console.log(`${COLORS.green}${COLORS.bright}The x402 payment flow completed successfully!${COLORS.reset}\n`);
      console.log(`Next steps:`);
      console.log(`  1. View dashboard: ${COLORS.cyan}${DASHBOARD_URL}${COLORS.reset}`);
      console.log(`  2. Check transaction on explorer`);
      console.log(`  3. Review payment receipts\n`);
    } else {
      printBanner('✗ DEMO FAILED - See Errors Above');
      console.log(`${COLORS.red}${COLORS.bright}The demo encountered errors.${COLORS.reset}\n`);
      console.log(`Troubleshooting:`);
      console.log(`  1. Check that PRIVATE_KEY is set in .env`);
      console.log(`  2. Ensure wallet has USDC.e: ${COLORS.cyan}https://faucet.cronos.org${COLORS.reset}`);
      console.log(`  3. Verify facilitator is accessible\n`);
    }

  } catch (error) {
    printError(`Demo error: ${error.message}`);
    exitCode = 1;
  } finally {
    await cleanup();
  }

  process.exit(exitCode);
}

// Handle interrupts gracefully
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT, cleaning up...');
  await cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM, cleaning up...');
  await cleanup();
  process.exit(143);
});

// Run the demo
main().catch((error) => {
  console.error('Fatal error:', error);
  cleanup().finally(() => process.exit(1));
});
