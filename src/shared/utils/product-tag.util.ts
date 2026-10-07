/**
 * Utilidad para normalizar y autogenerar etiquetas oficiales de productos (KOS Tags)
 */
export function normalizeProductTag(productName: string): string {
  if (!productName) return 'PROD_GENERAL';

  const upper = productName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Detección de materias/productos conocidos para etiquetas limpias
  if (upper.includes('MATEMATICA')) return 'PROD_MATEMATICA';
  if (upper.includes('QUIMICA')) return 'PROD_QUIMICA';
  if (upper.includes('FISICA')) return 'PROD_FISICA';
  if (upper.includes('INGLES')) return 'PROD_INGLES';
  if (upper.includes('BIOLOGIA')) return 'PROD_BIOLOGIA';
  if (upper.includes('CASTELLANO')) return 'PROD_CASTELLANO';
  if (upper.includes('CEJAS')) return 'PROD_CEJAS_Y_PESTANAS';
  if (upper.includes('TAROT')) return 'PROD_TAROT';
  if (upper.includes('PREESCOLAR')) return 'PROD_PREESCOLAR';
  if (upper.includes('BIBLICO')) return 'PROD_BIBLICO';
  if (upper.includes('ROBOTICA')) return 'PROD_ROBOTICA';

  // Generación genérica basada en palabras clave
  const words = upper
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .filter((w) => !['DE', 'DEL', 'Y', 'EL', 'LA', 'LOS', 'LAS', 'EN', 'PARA', 'CON', 'UN', 'UNA', 'KIT', 'MEGA', 'CURSO', 'MASTERCLASS'].includes(w));

  const slug = words.slice(0, 3).join('_');
  return slug ? `PROD_${slug}` : 'PROD_GENERAL';
}
