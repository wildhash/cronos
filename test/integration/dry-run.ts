#!/usr/bin/env tsx
/**
 * Dry run test - starts services, validates they work, then exits
 * Used for CI to verify the demo stack starts correctly
 */

import { spawn, ChildProcess } from 'child_process';
import kill from 'tree-kill';

const SELLER_API_URL = 'http://localhost:3001';
const DASHBOARD_URL = 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds

let sellerProcess: ChildProcess | null = null;
let dashboardProcess: ChildProcess | null = null;

async function cleanup(exitCode: number = 0) {
  console.log('\n🧹 Cleaning up...');
  
  const promises: Promise<void>[] = [];
  
  if (sellerProcess?.pid) {
    promises.push(new Promise((resolve) => {
      kill(sellerProcess!.pid!, 'SIGTERM', () => {
        console.log('✓ Stopped Seller');
        resolve();
      });
    }));
  }
  
  if (dashboardProcess?.pid) {
    promises.push(new Promise((resolve) => {
      kill(dashboardProcess!.pid!, 'SIGTERM', () => {
        console.log('✓ Stopped Dashboard');
        resolve();
      });
    }));
  }
  
  await Promise.all(promises);
  process.exit(exitCode);
}

async function waitForService(url: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log(`✓ ${name} is ready`);
          resolve();
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      if (Date.now() - startTime > TIMEOUT) {
        reject(new Error(`${name} failed to start within ${TIMEOUT}ms`));
        return;
      }
      
      setTimeout(check, 500);
    };
    
    check();
  });
}

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Dry Run Test - Starting Services');
  console.log('='.repeat(60));
  console.log('');
  
  const env = {
    ...process.env,
    SELLER_API_PORT: '3001',
    DASHBOARD_PORT: '3000',
    SELLER_ADDRESS: '0x0000000000000000000000000000000000000000',
  };
  
  try {
    // Start Seller
    console.log('▶ Starting Seller...');
    sellerProcess = spawn('npx', ['tsx', 'apps/seller-api/index.ts'], {
      env,
      stdio: 'pipe',
      detached: false
    });
    
    sellerProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Error') || msg.includes('error')) {
        console.error(`Seller error: ${msg}`);
      }
    });
    
    await waitForService(`${SELLER_API_URL}/api/health`, 'Seller');
    console.log('✓ Seller started\n');
    
    // Start Dashboard
    console.log('▶ Starting Dashboard...');
    dashboardProcess = spawn('npx', ['tsx', 'dashboard/server.ts'], {
      env,
      stdio: 'pipe',
      detached: false
    });
    
    dashboardProcess.stdout?.on('data', (data) => {
      const msg = data.toString();
      console.log(`Dashboard: ${msg.trim()}`);
    });
    
    dashboardProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      console.error(`Dashboard error: ${msg}`);
    });
    
    await waitForService(`${DASHBOARD_URL}`, 'Dashboard');
    console.log('✓ Dashboard started\n');
    
    // Validate x402 response
    console.log('▶ Validating x402 response...');
    const response = await fetch(`${SELLER_API_URL}/api/premium-data`);
    
    if (response.status !== 402) {
      throw new Error(`Expected 402, got ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.paymentRequired || !data.amount || !data.recipient) {
      throw new Error('Invalid x402 response structure');
    }
    
    console.log('✓ 402 response valid\n');
    
    // Success
    console.log('='.repeat(60));
    console.log('  ✓ DRY RUN SUCCESS');
    console.log('='.repeat(60));
    console.log('');
    
    await cleanup(0);
    
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error);
    console.error('');
    await cleanup(1);
  }
}

// Handle interrupts
process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));

main();
