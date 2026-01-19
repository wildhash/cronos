/**
 * Receipt persistence module for x402 payments
 * Stores payment receipts locally for audit and dashboard display
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECEIPTS_FILE = path.join(__dirname, '..', 'data', 'receipts.json');

export interface PaymentReceipt {
  txHash: string;
  payer: string;
  recipient: string;
  amount: string;
  currency: string;
  resource: string;
  timestamp: number;
  chainId: number;
  explorerUrl: string;
  facilitatorUrl: string;
  schemaVersion: string;
  metadata?: any;
}

export interface RefundReceipt {
  originalTxHash: string;
  refundTxHash?: string;
  streamId?: string;
  refundPercent: number;
  refundAmount: string;
  reason: string;
  breachType: string;
  timestamp: number;
  chainId: number;
  explorerUrl?: string;
  metadata?: any;
}

export interface ReceiptStore {
  payments: PaymentReceipt[];
  refunds: RefundReceipt[];
  lastUpdated: number;
}

/**
 * Load receipts from disk
 */
export function loadReceipts(): ReceiptStore {
  try {
    if (fs.existsSync(RECEIPTS_FILE)) {
      const data = fs.readFileSync(RECEIPTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading receipts:', error);
  }
  
  return {
    payments: [],
    refunds: [],
    lastUpdated: Date.now()
  };
}

/**
 * Save receipts to disk
 */
export function saveReceipts(store: ReceiptStore): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(RECEIPTS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    store.lastUpdated = Date.now();
    fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Error saving receipts:', error);
  }
}

/**
 * Add a payment receipt
 */
export function addPaymentReceipt(receipt: PaymentReceipt): void {
  const store = loadReceipts();
  
  // Avoid duplicates
  const exists = store.payments.some(p => p.txHash === receipt.txHash);
  if (!exists) {
    store.payments.push(receipt);
    saveReceipts(store);
  }
}

/**
 * Add a refund receipt
 */
export function addRefundReceipt(receipt: RefundReceipt): void {
  const store = loadReceipts();
  store.refunds.push(receipt);
  saveReceipts(store);
}

/**
 * Get recent payment receipts
 */
export function getRecentPayments(count: number = 20): PaymentReceipt[] {
  const store = loadReceipts();
  return store.payments
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count);
}

/**
 * Get recent refund receipts
 */
export function getRecentRefunds(count: number = 20): RefundReceipt[] {
  const store = loadReceipts();
  return store.refunds
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count);
}

/**
 * Get payment by txHash
 */
export function getPaymentByTxHash(txHash: string): PaymentReceipt | null {
  const store = loadReceipts();
  return store.payments.find(p => p.txHash === txHash) || null;
}

/**
 * Get receipt statistics
 */
export function getReceiptStats() {
  const store = loadReceipts();
  
  const totalPayments = store.payments.length;
  const totalRefunds = store.refunds.length;
  
  const totalPaid = store.payments.reduce((sum, p) => {
    return sum + BigInt(p.amount);
  }, BigInt(0));
  
  const totalRefunded = store.refunds.reduce((sum, r) => {
    return sum + BigInt(r.refundAmount);
  }, BigInt(0));
  
  return {
    totalPayments,
    totalRefunds,
    totalPaid: totalPaid.toString(),
    totalRefunded: totalRefunded.toString(),
    lastUpdated: store.lastUpdated
  };
}

export default {
  loadReceipts,
  saveReceipts,
  addPaymentReceipt,
  addRefundReceipt,
  getRecentPayments,
  getRecentRefunds,
  getPaymentByTxHash,
  getReceiptStats
};
