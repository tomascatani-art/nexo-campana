import {
  AirVent, Armchair, Baby, Bath, Bed, Blend, Briefcase, Cable, Camera, Coffee, CookingPot, Dumbbell, Fan, Flame, Gamepad2, Gift,
  Hammer, Headphones, Lamp, Laptop, Microwave, Package, PawPrint, Plug, PlugZap, Refrigerator, Shirt, Smartphone, Sofa, Soup,
  Sparkles, Speaker, Sprout, ToyBrick, Tv, Utensils, WashingMachine, Watch, Wine, type LucideIcon,
} from 'lucide-react';

/** Íconos que el propietario puede elegir para cada categoría. */
export const CATEGORY_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  'plug-zap': { label: 'Electro', Icon: PlugZap },
  plug: { label: 'Enchufe', Icon: Plug },
  'cooking-pot': { label: 'Cocina', Icon: CookingPot },
  utensils: { label: 'Bazar / cubiertos', Icon: Utensils },
  wine: { label: 'Copas / vasos', Icon: Wine },
  coffee: { label: 'Café / desayuno', Icon: Coffee },
  soup: { label: 'Vajilla', Icon: Soup },
  blend: { label: 'Licuadora', Icon: Blend },
  microwave: { label: 'Microondas', Icon: Microwave },
  refrigerator: { label: 'Heladera', Icon: Refrigerator },
  'washing-machine': { label: 'Lavarropas', Icon: WashingMachine },
  sofa: { label: 'Hogar / living', Icon: Sofa },
  armchair: { label: 'Muebles', Icon: Armchair },
  bed: { label: 'Dormitorio / blanquería', Icon: Bed },
  bath: { label: 'Baño', Icon: Bath },
  lamp: { label: 'Iluminación', Icon: Lamp },
  fan: { label: 'Ventiladores', Icon: Fan },
  'air-vent': { label: 'Climatización', Icon: AirVent },
  flame: { label: 'Calefacción', Icon: Flame },
  smartphone: { label: 'Celulares / tecnología', Icon: Smartphone },
  laptop: { label: 'Computación', Icon: Laptop },
  tv: { label: 'TV / video', Icon: Tv },
  headphones: { label: 'Audio', Icon: Headphones },
  speaker: { label: 'Parlantes', Icon: Speaker },
  cable: { label: 'Cables / accesorios', Icon: Cable },
  camera: { label: 'Cámaras', Icon: Camera },
  watch: { label: 'Relojes', Icon: Watch },
  'gamepad-2': { label: 'Gaming', Icon: Gamepad2 },
  'toy-brick': { label: 'Juguetes', Icon: ToyBrick },
  baby: { label: 'Bebés', Icon: Baby },
  shirt: { label: 'Textil', Icon: Shirt },
  dumbbell: { label: 'Deportes', Icon: Dumbbell },
  hammer: { label: 'Herramientas', Icon: Hammer },
  sprout: { label: 'Jardín', Icon: Sprout },
  'paw-print': { label: 'Mascotas', Icon: PawPrint },
  briefcase: { label: 'Librería / oficina', Icon: Briefcase },
  gift: { label: 'Regalería', Icon: Gift },
  sparkles: { label: 'Limpieza', Icon: Sparkles },
  package: { label: 'Varios', Icon: Package },
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name]?.Icon ?? Package;
  return <Icon className={className} aria-hidden />;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22h3.4Z" />
    </svg>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}
