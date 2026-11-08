import { getProduct } from './data';

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  amount: number;
  status: 'confirmed' | 'return_requested';
  address: string;
  placedBy: string;
  createdAt: string;
  refundAmount?: number;
}

interface State {
  cart: CartItem[];
  orders: Order[];
  address: string;
  seq: number;
}

type G = typeof globalThis & { __shopState?: State };

function fresh(): State {
  return { cart: [], orders: [], address: 'Knez Mihailova 1, 11000 Belgrade', seq: 0 };
}

export function state(): State {
  const g = globalThis as G;
  if (!g.__shopState) g.__shopState = fresh();
  return g.__shopState;
}

export function resetState() {
  (globalThis as G).__shopState = fresh();
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + (getProduct(i.productId)?.price ?? 0) * i.qty, 0);
}

export function nextOrderId(): string {
  const s = state();
  s.seq += 1;
  return `114-${String(3049000 + s.seq * 37).padStart(7, '0')}`;
}

export function actorFrom(headers: Headers): string {
  const agent = headers.get('x-agentgate-agent');
  return agent ? `${agent} via AgentGate` : 'ShopDemo.com';
}
