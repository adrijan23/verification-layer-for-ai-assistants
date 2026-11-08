export interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  listPrice?: number;
  rating: number;
  reviews: number;
  category: 'audio' | 'wearable' | 'computer' | 'accessory';
  bullets: string[];
  delivery: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'p-headphones', title: 'Noise-cancelling headphones', brand: 'Auralis NC700',
    price: 89, listPrice: 129, rating: 4.6, reviews: 12480, category: 'audio', delivery: 'Tomorrow',
    bullets: ['Adaptive noise cancelling', '30-hour battery', 'Multipoint Bluetooth 5.3', 'Fold-flat travel case'],
  },
  {
    id: 'p-watch', title: 'Smartwatch', brand: 'Pulse S4',
    price: 249, rating: 4.4, reviews: 5310, category: 'wearable', delivery: 'Tomorrow',
    bullets: ['AMOLED always-on display', 'GPS + heart rate', '7-day battery', 'Water resistant 5 ATM'],
  },
  {
    id: 'p-laptop', title: 'Laptop Pro 14', brand: 'Northwind',
    price: 1299, listPrice: 1499, rating: 4.7, reviews: 2204, category: 'computer', delivery: 'Wed, 11 Nov',
    bullets: ['14" 120 Hz display', '16 GB RAM · 1 TB SSD', '18-hour battery', '1.4 kg aluminium body'],
  },
  {
    id: 'p-earbuds', title: 'Wireless earbuds', brand: 'Auralis Buds 2',
    price: 59, rating: 4.3, reviews: 8790, category: 'audio', delivery: 'Tomorrow',
    bullets: ['Active noise cancelling', 'Wireless charging case', 'IPX4 sweat resistant'],
  },
  {
    id: 'p-charger', title: 'USB-C charger 65W', brand: 'Voltix',
    price: 29, rating: 4.8, reviews: 20112, category: 'accessory', delivery: 'Tomorrow',
    bullets: ['Charges laptop + phone', 'GaN, pocket size', 'Foldable plug'],
  },
  {
    id: 'p-keyboard', title: 'Mechanical keyboard', brand: 'Keyforge 75',
    price: 119, rating: 4.5, reviews: 3409, category: 'computer', delivery: 'Thu, 12 Nov',
    bullets: ['Hot-swappable switches', 'Wireless + USB-C', 'Aluminium case'],
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function searchProducts(q: string): Product[] {
  const t = q.trim().toLowerCase();
  if (!t) return PRODUCTS;
  return PRODUCTS.filter((p) => `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(t));
}

export function eur(n: number): string {
  return `€${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
