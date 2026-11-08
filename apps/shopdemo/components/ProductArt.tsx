import type { Product } from '@/lib/data';

const TONES: Record<Product['category'], string> = {
  audio: 'from-[#E9E4FF] to-[#C9D6FF]',
  wearable: 'from-[#DFF5EC] to-[#B9E6D3]',
  computer: 'from-[#E8EEF5] to-[#C8D4E3]',
  accessory: 'from-[#FFF1D6] to-[#FFDCA3]',
};

function Glyph({ id }: { id: string }) {
  const stroke = { stroke: '#14213D', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'p-headphones':
      return (
        <g {...stroke}>
          <path d="M22 58V48a28 28 0 0 1 56 0v10" />
          <rect x="16" y="54" width="14" height="24" rx="6" fill="#14213D" />
          <rect x="70" y="54" width="14" height="24" rx="6" fill="#14213D" />
        </g>
      );
    case 'p-watch':
      return (
        <g {...stroke}>
          <path d="M40 18h20l3 14H37zM40 82h20l3-14H37z" fill="#14213D" />
          <rect x="30" y="30" width="40" height="40" rx="10" fill="#fff" />
          <path d="M50 40v10l7 5" />
        </g>
      );
    case 'p-laptop':
      return (
        <g {...stroke}>
          <rect x="24" y="26" width="52" height="34" rx="3" fill="#fff" />
          <path d="M14 70h72l-6 6H20z" fill="#14213D" />
        </g>
      );
    case 'p-earbuds':
      return (
        <g {...stroke}>
          <rect x="28" y="50" width="44" height="26" rx="13" fill="#fff" />
          <circle cx="40" cy="38" r="8" fill="#14213D" />
          <circle cx="60" cy="38" r="8" fill="#14213D" />
        </g>
      );
    case 'p-charger':
      return (
        <g {...stroke}>
          <rect x="32" y="30" width="36" height="40" rx="8" fill="#fff" />
          <path d="M44 30V20M56 30V20M50 70v12" />
          <path d="m52 40-6 10h8l-6 10" />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <rect x="14" y="34" width="72" height="32" rx="5" fill="#fff" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={20 + i * 11} y="40" width="8" height="8" rx="1.5" fill="#14213D" />
          ))}
          <rect x="30" y="54" width="40" height="7" rx="2" fill="#14213D" />
        </g>
      );
  }
}

export function ProductArt({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  return (
    <div className={`grid aspect-square w-full place-items-center rounded-xl bg-gradient-to-br ${TONES[product.category]}`}>
      <svg viewBox="0 0 100 100" className={size === 'lg' ? 'w-3/5' : 'w-1/2'} aria-hidden>
        <Glyph id={product.id} />
      </svg>
    </div>
  );
}

export function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="text-amber-500" aria-label={`${rating} out of 5`}>
        {'★★★★★'.slice(0, Math.round(rating))}
        <span className="text-paper-200">{'★★★★★'.slice(Math.round(rating))}</span>
      </span>
      <span className="text-night-700 tabular">{reviews.toLocaleString('en-US')}</span>
    </span>
  );
}
