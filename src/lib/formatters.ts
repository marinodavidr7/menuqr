/**
 * Formatea un monto en centavos a ARS con formato rioplatense: "$ 22.000"
 */
export function formatPrice(cents: number): string {
  const pesos = Math.round(cents / 100);
  const formatted = new Intl.NumberFormat('es-AR', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(pesos);
  return `$ ${formatted}`;
}

/**
 * Formatea fecha y hora en estilo rioplatense
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formatea hora simple HH:mm
 */
export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Minutos transcurridos desde una fecha ISO
 */
export function minutesElapsed(isoString: string): number {
  try {
    const start = new Date(isoString).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 60000));
  } catch {
    return 0;
  }
}

/**
 * Clase condicional utilitaria
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
