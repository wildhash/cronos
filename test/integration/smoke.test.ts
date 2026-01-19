/**
 * Smoke test for Seller API
 * 
 * Tests basic functionality without requiring real blockchain interaction
 */

import { expect } from 'chai';
import { execSync, spawn, ChildProcess } from 'child_process';

describe('Seller API Smoke Test', function() {
  this.timeout(30000); // 30 second timeout for starting server

  let serverProcess: ChildProcess | null = null;
  const SELLER_API_URL = 'http://localhost:3001';

  before(async function() {
    // Start the seller API in background
    console.log('Starting Seller API...');
    
    // Set minimal env vars for testing
    const env = {
      ...process.env,
      SELLER_API_PORT: '3001',
      SELLER_ADDRESS: '0x0000000000000000000000000000000000000000',
    };

    serverProcess = spawn('npx', ['tsx', 'apps/seller-api/index.ts'], {
      env,
      stdio: 'pipe',
      detached: false
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 25 seconds'));
      }, 25000);

      const checkServer = async () => {
        try {
          const response = await fetch(`${SELLER_API_URL}/api/health`);
          if (response.ok) {
            clearTimeout(timeout);
            console.log('Seller API started successfully');
            resolve(true);
          } else {
            setTimeout(checkServer, 500);
          }
        } catch (error) {
          setTimeout(checkServer, 500);
        }
      };

      checkServer();
    });
  });

  after(function() {
    // Clean up server process
    if (serverProcess) {
      console.log('Stopping Seller API...');
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  describe('Health Check', function() {
    it('should return 200 OK for /api/health', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/health`);
      expect(response.status).to.equal(200);

      const data = await response.json();
      expect(data).to.have.property('status', 'ok');
      expect(data).to.have.property('service');
      expect(data).to.have.property('network');
      expect(data).to.have.property('chainId');
    });
  });

  describe('Pricing Endpoint', function() {
    it('should return pricing information', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/pricing`);
      expect(response.status).to.equal(200);

      const data = await response.json();
      expect(data).to.have.property('endpoints');
      expect(data.endpoints).to.be.an('array');
      expect(data).to.have.property('currency', 'USDC.e');
    });
  });

  describe('x402 Payment Flow', function() {
    it('should return 402 Payment Required for /api/premium-data without payment', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/premium-data`);
      expect(response.status).to.equal(402);

      const data = await response.json();
      expect(data).to.have.property('paymentRequired', true);
      expect(data).to.have.property('amount');
      expect(data).to.have.property('currency', 'USDC.e');
      expect(data).to.have.property('recipient');
      expect(data).to.have.property('chainId');
      expect(data).to.have.property('facilitatorUrl');
    });

    it('should return 402 for /api/ai-inference without payment', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/ai-inference`);
      expect(response.status).to.equal(402);

      const data = await response.json();
      expect(data).to.have.property('paymentRequired', true);
      expect(data).to.have.property('amount');
      expect(data).to.have.property('currency', 'USDC.e');
    });

    it('should validate x402 response against schema structure', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/premium-data`);
      const data = await response.json();

      // Validate required fields from x402.json schema
      expect(data.paymentRequired).to.be.a('boolean');
      expect(data.amount).to.be.a('string');
      expect(data.amount).to.match(/^[0-9]+$/);
      expect(data.recipient).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(data.chainId).to.be.a('number');
      expect(data.facilitatorUrl).to.be.a('string');
      expect(data.facilitatorUrl).to.include('http');
    });
  });

  describe('Payment History', function() {
    it('should return empty payment list initially', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/payments`);
      expect(response.status).to.equal(200);

      const data = await response.json();
      expect(data).to.have.property('payments');
      expect(data.payments).to.be.an('array');
      expect(data).to.have.property('total');
    });

    it('should return 404 for non-existent payment', async function() {
      const response = await fetch(`${SELLER_API_URL}/api/payments/0x1234567890abcdef`);
      expect(response.status).to.equal(404);

      const data = await response.json();
      expect(data).to.have.property('error');
    });
  });
});
