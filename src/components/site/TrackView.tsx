'use client';
import { useEffect } from 'react';
import { trackProductAction } from '@/app/order-actions';

/** Suma una visita al producto (una vez por sesión del navegador). */
export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    try {
      const k = `nexo-visto-${id}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch { /* */ }
    trackProductAction(id, 'view').catch(() => {});
  }, [id]);
  return null;
}
