/**
 * Limpia y extrae exclusivamente el texto destinado al usuario final (WhatsApp/Meta),
 * eliminando etiquetas de razonamiento interno, bloques de herramientas y pseudo-tags.
 */
export function sanitizeUserFacingResponse(rawContent: string): string {
  if (!rawContent || typeof rawContent !== 'string') return '';

  let text = rawContent.trim();

  // 1. Si el modelo produjo un bloque [FINAL RESPONSE] o [RESPUESTA FINAL], extraer únicamente ese contenido
  const finalResponseMatch = text.match(/\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]\s*:?\s*([\s\S]+)$/i);
  if (finalResponseMatch && finalResponseMatch[1]) {
    text = finalResponseMatch[1].trim();
  }

  // 2. Eliminar bloques internos como [SYSTEM], [STATE], [THOUGHT], [TOOL CALLS], [ACTION], etc.
  text = text.replace(/\[(?:SYSTEM|STATE|THOUGHT|PENSAMIENTO|TOOL CALLS|HERRAMIENTAS|ACTION|ACCION)\][\s\S]*?(?=\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]|$)/gi, '');

  // 3. Eliminar etiquetas tipo XML <thought>...</thought> o <reasoning>...</reasoning>
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

  // 4. Eliminar prefijos comunes no deseados como 'Response: "' o 'Respuesta: "'
  text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
  text = text.replace(/["']?$/i, '');

  // 5. Limpiar saltos de línea excesivos
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
