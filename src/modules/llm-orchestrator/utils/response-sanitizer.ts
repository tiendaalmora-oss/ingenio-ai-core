/**
 * Limpia y extrae exclusivamente el texto destinado al usuario final (WhatsApp/Meta),
 * eliminando etiquetas de razonamiento interno, monólogos en inglés de planificación,
 * bloques de herramientas y pseudo-tags.
 */
export function sanitizeUserFacingResponse(rawContent: string): string {
  if (!rawContent || typeof rawContent !== 'string') return '';

  let text = rawContent.trim();

  // 1. Reemplazar saltos de línea literales escapados (\n) por saltos de línea reales
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // 2. Si el modelo produjo un bloque [FINAL RESPONSE] o [RESPUESTA FINAL], extraer únicamente ese contenido
  const finalResponseMatch = text.match(/\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]\s*:?\s*([\s\S]+)$/i);
  if (finalResponseMatch && finalResponseMatch[1]) {
    text = finalResponseMatch[1].trim();
  }

  // 3. Eliminar etiquetas tipo XML <thought>...</thought>, <reasoning>...</reasoning>, <scratchpad>...</scratchpad>
  text = text.replace(/<(?:thought|reasoning|scratchpad|inner_monologue)>[\s\S]*?<\/(?:thought|reasoning|scratchpad|inner_monologue)>/gi, '');

  // 4. Eliminar bloques internos tipo pseudo-tags como [SYSTEM], [STATE], [THOUGHT], [TOOL CALLS], [ACTION], etc.
  text = text.replace(/\[(?:SYSTEM|STATE|THOUGHT|PENSAMIENTO|TOOL CALLS|HERRAMIENTAS|ACTION|ACCION|PLAN|REASONING)\][\s\S]*?(?=\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]|$)/gi, '');

  // 5. Si el modelo mezcló monólogo de planificación en inglés con el mensaje real entre comillas
  // Ej: `Initialize a new conversation... The first message is: "¡Hola, profe! ... 👇" I should also update...`
  const quotedMessageMatch = text.match(/(?:The (?:first|next|welcome) message (?:in this funnel )?is:?|Response:?)\s*["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i);
  if (quotedMessageMatch && quotedMessageMatch[1]) {
    text = quotedMessageMatch[1].trim();
  }

  // 6. Eliminar frases comunes de monólogo interno en inglés al inicio o final del texto
  text = text.replace(/^(?:Initialize a new conversation[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  text = text.replace(/^(?:The user has expressed interest[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  text = text.replace(/^(?:According to the provided knowledge base[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  text = text.replace(/^(?:Based on the sales funnel[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  text = text.replace(/^(?:I will now respond[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  text = text.replace(/^(?:As an AI assistant[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
  
  // Limpiar coletillas finales de planificación (ej: "I should also update the business memory...")
  text = text.replace(/\s*(?:I should also update[\s\S]*$)/i, '');
  text = text.replace(/\s*(?:I will also update[\s\S]*$)/i, '');
  text = text.replace(/\s*(?:I need to update the memory[\s\S]*$)/i, '');
  text = text.replace(/\s*(?:Note: I (?:should|will)[\s\S]*$)/i, '');

  // 7. Eliminar prefijos comunes no deseados como 'Response: "' o 'Respuesta: "'
  text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
  text = text.replace(/^["“']|["”']$/g, '').trim();

  // 8. Convertir negrita de Markdown estándar (**) al formato de negrita nativo de WhatsApp (*)
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');

  // 9. Eliminar placeholders alucinados de archivos o imágenes entre corchetes (ej: [IMAGEN DE...], [FOTO DE...])
  text = text.replace(/\[(?:IMAGEN|FOTO|CAPTURE|CAPTURA|ADJUNTO|ARCHIVO|IMAGE|PHOTO|FILE)(?:\s+DE|\s*:)?\s*[^\]]+\]/gi, '');

  // 10. Limpiar saltos de línea excesivos y espacios residuales
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
