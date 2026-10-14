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

  // 4.1 Eliminar líneas y bloques filtrados de estado interno del embudo o instrucciones del sistema
  text = text.replace(/\[?(?:METADATO INTERNO DEL SISTEMA\s*-\s*|SISTEMA INTERNO\s*-\s*)?ESTADO DEL EMBUDO[^\]\n]*\]?:?/gi, '');
  text = text.replace(/^[ \t]*(?:✅|⏳|\u2705|\u23f3)?\s*(?:Estado\s+)?Paso\s+\d+[:\s—\-]*(?:COMPLETADO|PENDIENTE)[^\n]*(?:\r?\n|$)/gim, '');
  text = text.replace(/^[ \t]*(?:⏳|🟢)?\s*CLIENTE\s+(?:CALIFICADO|EN ETAPA|CONFIRMADO|EN ESPERA|REGISTRADO)[^\n]*(?:\r?\n|$)/gim, '');
  text = text.replace(/^[ \t]*🛑\s*(?:INSTRUCCI[OÓ]N|CONTROL INTERNO|CONFIDENCIAL|PROHIBIDO)(?:\s+CR[IÍ]TICA)?:?[^\n]*(?:\r?\n|$)/gim, '');

  // 4.2 Eliminar código Python de ejecución de herramientas alucinado por Gemini
  // Ej: tool_code print(default_api.update_business_memory(...))
  text = text.replace(/tool_code\s*[\r\n]+(?:print\([^)]*\)\s*)*[^\n]*/gi, '');
  text = text.replace(/tool_code/gi, '');
  text = text.replace(/print\(default_api\.[^)]*\)/gi, '');
  text = text.replace(/default_api\.\w+\([^)]*\)/gi, '');

  // 5. Blindaje contra monólogos de razonamiento / planificación en inglés (Chain-of-Thought de Gemini)
  // Ej: "s asking for information about...", "This request falls under...", "The script for Step 1..."
  const englishPhrases = [
    /(?:The user i|I)?s asking for[^\n.]*/gi,
    /This request falls under[^\n.]*/gi,
    /The current state of the funnel[^\n.]*/gi,
    /Therefore, I need to[^\n.]*/gi,
    /I will use this script[^\n.]*/gi,
    /I (?:also )?need to (?:start|update)[^\n.]*/gi,
    /The user is interested[^\n.]*/gi,
    /so I should add[^\n.]*/gi,
    /I should also (?:set|update)[^\n.]*/gi,
    /Initialize a new conversation[^\n.]*/gi,
    /According to the provided[^\n.]*/gi,
    /Based on the sales funnel[^\n.]*/gi,
    /As an AI assistant[^\n.]*/gi,
    /Note: I (?:should|will)[^\n.]*/gi,
    /I need to update the memory[^\n.]*/gi,
  ];

  // Si tiene el patrón "The script for Step ... is: "..." seguido de monólogo,
  // verificar si el guion fue repetido al final o si solo está entre comillas
  const hasScriptCitation = /The script for (?:Step|Paso)\s*\d+[^:]*is:\s*["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i.exec(text);
  
  // Limpiar frases de razonamiento en inglés
  for (const pattern of englishPhrases) {
    text = text.replace(pattern, '');
  }

  // Eliminar prefijos de cita del guion
  text = text.replace(/The script for (?:Step|Paso)\s*\d+[^:]*is:\s*/gi, '');
  text = text.replace(/(?:The (?:first|next|welcome) message (?:in this funnel )?is:?|Response:?)\s*/gi, '');

  // Si había una cita y tras limpiar quedó el texto duplicado (citado y luego pegado al final), conservar solo uno
  if (hasScriptCitation && hasScriptCitation[1]) {
    const quotedContent = hasScriptCitation[1].trim();
    const firstOccur = text.indexOf(quotedContent);
    const lastOccur = text.lastIndexOf(quotedContent);
    if (firstOccur !== -1 && lastOccur !== -1 && firstOccur !== lastOccur) {
      text = text.substring(lastOccur).trim();
    }
  }

  // 6. Eliminar llamadas a funciones o tools crudas filtradas como texto (ej: call:update_business_memory{...})
  text = text.replace(/call:\w+\{[\s\S]*?(?:\}|$)/gi, '');
  text = text.replace(/call:\w+[\s\S]*$/gi, '');
  text = text.replace(/<ctrl\d+>/gi, '');
  text = text.replace(/<0x[0-9a-fA-F]+>/gi, '');
  text = text.replace(/(?:update_business_memory|create_task|pause_bot_and_handoff|handoff_to_human)\s*\{[\s\S]*?(?:\}|$)/gi, '');

  // 8. Eliminar prefijos comunes no deseados como 'Response: "' o 'Respuesta: "'
  text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
  text = text.replace(/^["“']|["”']$/g, '').trim();

  // 9. Convertir negrita de Markdown estándar (**) al formato de negrita nativo de WhatsApp (*)
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');

  // 10. Eliminar placeholders alucinados de archivos o imágenes entre corchetes (ej: [IMAGEN DE...], [FOTO DE...])
  text = text.replace(/\[(?:IMAGEN|FOTO|CAPTURE|CAPTURA|ADJUNTO|ARCHIVO|IMAGE|PHOTO|FILE)(?:\s+DE|\s*:)?\s*[^\]]+\]/gi, '');

  // 11. Limpiar saltos de línea excesivos y espacios residuales
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
