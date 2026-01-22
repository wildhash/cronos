#!/usr/bin/env node

/**
 * Cronox ParallelPay - SLA Breach Demo
 * 
 * Demonstrates SLA breach detection and graduated refund tiers:
 * - Simulates artificial latency spike or uptime drop
 * - Triggers refund logic
 * - Shows breach detection in terminal and dashboard
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const SELLER_PORT = 3001;
const DASHBOARD_PORT = 3000;
const SELLER_URL = `http://localhost:${SELLER_PORT}`;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

let sellerProcess = null;
let dashboardProcess = null;

function printBanner(title) {
  const line = '='.repeat(60);
  console.log(`\n${COLORS.bright}${COLORS.magenta}${line}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}${line}${COLORS.reset}\n`);
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

function printWarning(message) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

function printInfo(message) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${message}`);
}

function printBreach(message) {
  console.log(`${COLORS.bright}${COLORS.red}🚨 ${message}${COLORS.reset}`);
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

async function waitForHealthy(name, url, maxRetries = 20) {
  printSection(`Waiting for ${name}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    const health = await checkHealth(url);
    if (health.ok) {
      printSuccess(`${name} is ready`);
      return true;
    }
    process.stdout.write('.');
    await sleep(1000);
  }
  
  printError(`${name} timeout`);
  return false;
}

function startProcess(name, command, args, env = {}) {
  return new Promise((resolve, reject) => {
    printSection(`Starting ${name}...`);
    
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    });

    proc.on('error', (error) => {
      printError(`Failed: ${error.message}`);
      reject(error);
    });

    setTimeout(() => {
      if (proc.exitCode === null) {
        printSuccess(`${name} started`);
        resolve(proc);
      } else {
        reject(new Error(`${name} failed`));
      }
    }, 2000);
  });
}

async function simulateLatencyBreach() {
  printSection('Simulating Minor Breach: Latency Spike');
  printInfo('Scenario: p95 latency exceeds 200ms threshold');
  
  // Make several requests with artificial delay
  const breachDuration = 5; // 5 requests
  const results = [];
  
  for (let i = 0; i < breachDuration; i++) {
    const start = Date.now();
    
    try {
      // Add artificial delay by making request wait
      await sleep(250); // Simulate 250ms latency
      const response = await fetch(`${SELLER_URL}/api/premium-data`);
      const elapsed = Date.now() - start;
      
      results.push({
        status: response.status,
        latency: elapsed,
        breached: elapsed > 200
      });
      
      if (elapsed > 200) {
        printWarning(`Request ${i + 1}: ${elapsed}ms (BREACH - exceeds 200ms)`);
      } else {
        printInfo(`Request ${i + 1}: ${elapsed}ms (OK)`);
      }
    } catch (error) {
      printError(`Request ${i + 1}: Failed`);
    }
    
    await sleep(500);
  }
  
  const breaches = results.filter(r => r.breached).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  
  console.log();
  printBreach(`SLA BREACH DETECTED!`);
  printInfo(`  Breached requests: ${breaches}/${results.length}`);
  printInfo(`  Average latency: ${avgLatency.toFixed(0)}ms (threshold: 200ms)`);
  printInfo(`  Refund tier: 10% (Minor Breach)`);
  printInfo(`  Action: Partial refund triggered`);
  
  return {
    type: 'latency',
    breaches,
    total: results.length,
    avgLatency,
    refundPercent: 10
  };
}

async function simulateUptimeBreach() {
  printSection('Simulating Moderate Breach: Uptime Degradation');
  printInfo('Scenario: Service availability drops below 99.5%');
  
  // Simulate multiple requests with some failures
  const totalRequests = 20;
  const results = [];
  
  for (let i = 0; i < totalRequests; i++) {
    try {
      // Simulate failures (every 5th request fails)
      if (i % 5 === 0) {
        results.push({ success: false });
        printError(`Request ${i + 1}: Failed (simulated downtime)`);
      } else {
        const response = await fetch(`${SELLER_URL}/api/health`);
        results.push({ success: response.ok });
        if (response.ok) {
          printInfo(`Request ${i + 1}: Success`);
        } else {
          printError(`Request ${i + 1}: Failed (${response.status})`);
        }
      }
    } catch (error) {
      results.push({ success: false });
      printError(`Request ${i + 1}: Network error`);
    }
    
    await sleep(100);
  }
  
  const successes = results.filter(r => r.success).length;
  const uptime = (successes / totalRequests) * 100;
  
  console.log();
  printBreach(`SLA BREACH DETECTED!`);
  printInfo(`  Successful requests: ${successes}/${totalRequests}`);
  printInfo(`  Uptime: ${uptime.toFixed(1)}% (threshold: 99.5%)`);
  printInfo(`  Refund tier: 25% (Moderate Breach)`);
  printInfo(`  Action: Partial refund triggered`);
  
  return {
    type: 'uptime',
    successes,
    total: totalRequests,
    uptime,
    refundPercent: 25
  };
}

async function recordBreach(breachData) {
  printSection('Recording Breach Event...');
  
  try {
    // Record to dashboard
    const response = await fetch(`${DASHBOARD_URL}/api/refunds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: breachData.type,
        severity: breachData.refundPercent === 10 ? 'minor' : 'moderate',
        refundPercent: breachData.refundPercent,
        timestamp: Date.now(),
        details: breachData,
      })
    });
    
    if (response.ok) {
      printSuccess('Breach recorded to dashboard');
    } else {
      printWarning('Failed to record to dashboard (service may not be running)');
    }
  } catch (error) {
    printWarning('Dashboard not available for breach recording');
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
  printBanner('Cronox ParallelPay - SLA Breach Demo');
  
  // Load SLA config
  const slaConfigPath = path.join(__dirname, '..', 'examples', 'sla-demo.json');
  let slaConfig = null;
  
  try {
    const configData = fs.readFileSync(slaConfigPath, 'utf8');
    slaConfig = JSON.parse(configData);
    printSuccess('Loaded SLA configuration');
    printInfo(`  Resource: ${slaConfig.resource}`);
    printInfo(`  Latency SLA: p95 < ${slaConfig.sla.latency.p95_ms}ms`);
    printInfo(`  Uptime SLA: ${slaConfig.sla.uptime.percent}%`);
  } catch (error) {
    printWarning('Could not load sla-demo.json, using defaults');
  }
  
  console.log();
  printInfo('This demo simulates SLA breaches with graduated refunds:');
  printInfo('  • Minor breach (latency spike) → 10% refund');
  printInfo('  • Moderate breach (uptime drop) → 25% refund');
  console.log();

  let exitCode = 0;

  try {
    // Start services
    sellerProcess = await startProcess('Seller', 'npx', ['tsx', 'apps/seller-api/index.ts']);
    dashboardProcess = await startProcess('Dashboard', 'npx', ['tsx', 'dashboard/server.ts']);

    // Wait for health
    const sellerReady = await waitForHealthy('Seller', SELLER_URL);
    const dashboardReady = await waitForHealthy('Dashboard', DASHBOARD_URL);

    if (!sellerReady) {
      exitCode = 1;
      return;
    }

    // Get breach type from args
    const breachType = process.argv[2] || 'latency';
    
    let breachResult;
    if (breachType === 'uptime') {
      breachResult = await simulateUptimeBreach();
    } else {
      breachResult = await simulateLatencyBreach();
    }

    // Record the breach
    if (dashboardReady) {
      await recordBreach(breachResult);
    }

    // Show summary
    printBanner('SLA Breach Demo Complete');
    console.log(`${COLORS.bright}Breach Summary:${COLORS.reset}`);
    console.log(`  Type: ${breachResult.type}`);
    console.log(`  Refund: ${breachResult.refundPercent}%`);
    console.log();
    console.log(`${COLORS.cyan}Next steps:${COLORS.reset}`);
    console.log(`  1. View dashboard: ${DASHBOARD_URL}`);
    console.log(`  2. Check refund history at /api/refunds`);
    console.log(`  3. Review SLA config: examples/sla-demo.json`);
    console.log();

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

main().catch((error) => {
  console.error('Fatal:', error);
  cleanup().finally(() => process.exit(1));
});
