export type FareClass = 'economy' | 'business';

export interface Fare {
  price: number;
  miles: number;
  label: string;
  perks: string[];
}

export interface Flight {
  id: string;
  from: string;
  fromCity: string;
  to: string;
  toCity: string;
  depart: string;
  arrive: string;
  duration: string;
  aircraft: string;
  stops: string;
  fares: Record<FareClass, Fare>;
}

export const AIRPORTS: Record<string, string> = {
  BEG: 'Belgrade',
  CDG: 'Paris',
  JFK: 'New York',
  LIS: 'Lisbon',
};

const economy = (price: number, miles: number): Fare => ({
  price,
  miles,
  label: 'Main Cabin',
  perks: ['Seat selection', '1 carry-on', 'Snacks & drinks'],
});
const business = (price: number, miles: number): Fare => ({
  price,
  miles,
  label: 'FlyDemo One',
  perks: ['Lie-flat seat', '2 checked bags', 'Lounge access', 'Priority boarding'],
});

export const FLIGHTS: Flight[] = [
  {
    id: 'FD101', from: 'BEG', fromCity: 'Belgrade', to: 'CDG', toCity: 'Paris',
    depart: '07:35', arrive: '10:05', duration: '2h 30m', aircraft: 'Airbus A321neo', stops: 'Nonstop',
    fares: { economy: economy(240, 30000), business: business(1400, 120000) },
  },
  {
    id: 'FD117', from: 'BEG', fromCity: 'Belgrade', to: 'CDG', toCity: 'Paris',
    depart: '18:20', arrive: '20:50', duration: '2h 30m', aircraft: 'Airbus A320', stops: 'Nonstop',
    fares: { economy: economy(310, 38000), business: business(1560, 130000) },
  },
  {
    id: 'FD455', from: 'BEG', fromCity: 'Belgrade', to: 'JFK', toCity: 'New York',
    depart: '10:15', arrive: '14:05', duration: '9h 50m', aircraft: 'Boeing 787-9', stops: 'Nonstop',
    fares: { economy: economy(690, 65000), business: business(3200, 210000) },
  },
  {
    id: 'FD231', from: 'BEG', fromCity: 'Belgrade', to: 'LIS', toCity: 'Lisbon',
    depart: '12:40', arrive: '15:25', duration: '3h 45m', aircraft: 'Airbus A321neo', stops: 'Nonstop',
    fares: { economy: economy(280, 34000), business: business(1250, 110000) },
  },
];

export function getFlight(id: string): Flight | undefined {
  return FLIGHTS.find((f) => f.id === id);
}

/** The coming Friday (today if it is Friday), as YYYY-MM-DD. */
export function thisFriday(now = new Date()): string {
  const d = new Date(now);
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function eur(n: number): string {
  return `€${n.toLocaleString('en-US')}`;
}

export function miles(n: number): string {
  return `${n.toLocaleString('en-US')} miles`;
}
