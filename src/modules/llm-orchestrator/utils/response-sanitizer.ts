/**
 * Validador estricto de seguridad para respuestas destinadas al cliente final en WhatsApp.
 * Retorna true si y solo si el texto es 100% seguro para enviarse a WhatsApp
 * (sin monólogos de planificación en inglés, llamadas a herramientas, tokens de arquitectura o fugas de metadatos).
 */
export function isSafeUserFacingResponse(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  // 1. Detección de herramientas, código o APIs internas
  const toolPattern = /(?:update_business_memory|create_task|pause_bot_and_handoff|handoff_to_human|schedule_meeting|default_api|tool_code|call:\w+)/i;
  if (toolPattern.test(trimmed)) return false;

  // 2. Detección de arquitectura, control de flujo o metadatos de sistema
  const internalArchitecturePattern = /(?:\bKOS\b|leadStatus|lead_status|sales funnel|\bfunnel\b|METADATO INTERNO|ESTADO DEL EMBUDO|\[SYSTEM\]|\[STATE\]|\[THOUGHT\]|\[TOOL CALLS\]|\[ACTION\]|\[FINAL RESPONSE\])/i;
  if (internalArchitecturePattern.test(trimmed)) return false;

  // 3. Fuga de etiquetas de estado de pasos del embudo
  const funnelStatePattern = /Paso\s+\d+[:\s—\-]*(?:COMPLETADO|PENDIENTE)/i;
  if (funnelStatePattern.test(trimmed)) return false;

  // 4. Marcadores clásicos de razonamiento (Chain-of-Thought) en inglés
  const reasoningMarkersPattern = /(?:\bAccording to\b|\bTherefore,?\s+I\b|\bThe user (?:has|is|wants)\b|\bThe script for\b|\bI need to (?:start|update)\b|\bI will use this script\b|\bI should (?:also )?(?:set|update|add)\b|\bThis request falls under\b|\btool can be used\b|\bshould be set to\b|\binterests\s*:\s*\[|\bleadStatus\s*:\s*['"]|\btags\s*:\s*\[|\bparameters?\s*:\s*\{|\bInitialize a new conversation\b)/i;
  if (reasoningMarkersPattern.test(trimmed)) return false;

  // 5. Análisis lingüístico: WhatsApp opera 100% en español.
  // Si el mensaje contiene 3 o más palabras distintivas del inglés que no existen en español conversacional, es una fuga de razonamiento.
  const englishStopwords = [
    'the', 'this', 'that', 'these', 'those', 'with', 'from', 'have', 'has', 'had',
    'will', 'would', 'should', 'could', 'because', 'according', 'which', 'about',
    'under', 'first', 'step', 'user', 'need', 'update', 'into', 'then', 'than',
    'them', 'their', 'there'
  ];
  const words = trimmed.toLowerCase().match(/[a-z]+/g) || [];
  let englishCount = 0;
  for (const word of words) {
    if (englishStopwords.includes(word)) {
      englishCount++;
      if (englishCount >= 3) return false;
    }
  }

  return true;
}

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
  text = text.replace(/tool_code\s*[\r\n]+(?:print\([^)]*\)\s*)*[^\n]*/gi, '');
  text = text.replace(/tool_code/gi, '');
  text = text.replace(/print\(default_api\.[^)]*\)/gi, '');
  text = text.replace(/default_api\.\w+\([^)]*\)/gi, '');

  // 5. Blindaje contra monólogos de razonamiento / planificación en inglés (Chain-of-Thought de Gemini)
  // Ej: "According to the KOS...", "s asking for information about...", "The update_business_memory tool can be used..."
  const englishPhrases = [
    /According to (?:the\s+)?(?:KOS|provided|sales\s+funnel|knowledge\s+base|guidelines|context)[^\n.]*/gi,
    /According to[^\n.]*/gi,
    /(?:The\s+)?update_business_memory\s+(?:tool\s+can\s+be\s+used|tool\s+is\s+used|tool)[^\n.]*/gi,
    /(?:The\s+)?(?:create_task|pause_bot_and_handoff|handoff_to_human)\s+tool[^\n.]*/gi,
    /(?:The user i|I)?s asking for[^\n.]*/gi,
    /The user has (?:expressed|asked|requested|stated|shown)[^\n.]*/gi,
    /The user is (?:interested|asking|requesting)[^\n.]*/gi,
    /This request falls under[^\n.]*/gi,
    /The current state of the funnel[^\n.]*/gi,
    /The first step for this product is[^\n.]*/gi,
    /The next step is[^\n.]*/gi,
    /Therefore, I (?:need to|will|should)[^\n.]*/gi,
    /Therefore,?[^\n.]*/gi,
    /I will use this script[^\n.]*/gi,
    /I (?:also )?need to (?:start|update|call|set)[^\n.]*/gi,
    /The user is interested[^\n.]*/gi,
    /so I should add[^\n.]*/gi,
    /I should also (?:set|update|call|add)[^\n.]*/gi,
    /I should (?:start|update|call|set)[^\n.]*/gi,
    /Initialize a new conversation[^\n.]*/gi,
    /Based on the (?:sales funnel|knowledge base|KOS)[^\n.]*/gi,
    /As an AI assistant[^\n.]*/gi,
    /Note: I (?:should|will|need)[^\n.]*/gi,
    /I need to update the memory[^\n.]*/gi,
    /interests\s*:\s*\[[^\]]*\]/gi,
    /leadStatus\s*:\s*['"][^'"]*['"]/gi,
    /tags\s*:\s*\[[^\]]*\]/gi,
    /parameters?\s*:\s*\{[^}]*\}/gi,
  ];

  // Si tiene el patrón "The script for Step ... is: "..." seguido de monólogo,
  // o una cita textual en comillas con saludo en español, verificar si podemos rescatar el saludo
  const hasScriptCitation = /(?:The script for (?:Step|Paso)\s*\d+[^:]*is:\s*|is:\s*)["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i.exec(text);

  // Limpiar frases de razonamiento en inglés
  for (const pattern of englishPhrases) {
    text = text.replace(pattern, '');
  }

  // Eliminar prefijos de cita del guion
  text = text.replace(/The script for (?:Step|Paso)\s*\d+[^:]*is:\s*/gi, '');
  text = text.replace(/(?:The (?:first|next|welcome) message (?:in this funnel )?is:?|Response:?)\s*/gi, '');

  // Si había una cita en comillas y quedó texto duplicado o quedó el guion citado, extraerlo limpiamente
  if (hasScriptCitation && hasScriptCitation[1]) {
    const quotedContent = hasScriptCitation[1].trim();
    const firstOccur = text.indexOf(quotedContent);
    const lastOccur = text.lastIndexOf(quotedContent);
    if (firstOccur !== -1 && lastOccur !== -1 && firstOccur !== lastOccur) {
      text = text.substring(lastOccur).trim();
    } else if (text.trim().length === 0 || !isSafeUserFacingResponse(text)) {
      text = quotedContent;
    }
  }

  // 6. Eliminar llamadas a funciones o tools crudas filtradas como texto (ej: call:update_business_memory{...})
  text = text.replace(/call:\w+\{[\s\S]*?(?:\}|$)/gi, '');
  text = text.replace(/call:\w+[\s\S]*$/gi, '');
  text = text.replace(/<ctrl\d+>/gi, '');
  text = text.replace(/<0x[0-9a-fA-F]+>/gi, '');
  text = text.replace(/(?:update_business_memory|create_task|pause_bot_and_handoff|handoff_to_human)\s*\{[\s\S]*?(?:\}|$)/gi, '');

  // 7. Eliminar prefijos comunes no deseados como 'Response: "' o 'Respuesta: "'
  text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
  text = text.replace(/^["“']|["”']$/g, '').trim();

  // 8. Convertir negrita de Markdown estándar (**) al formato de negrita nativo de WhatsApp (*)
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');

  // 9. Eliminar placeholders alucinados de archivos o imágenes entre corchetes (ej: [IMAGEN DE...], [FOTO DE...])
  text = text.replace(/\[(?:IMAGEN|FOTO|CAPTURE|CAPTURA|ADJUNTO|ARCHIVO|IMAGE|PHOTO|FILE)(?:\s+DE|\s*:)?\s*[^\]]+\]/gi, '');

  // 10. Eliminar puntuación residual o restos sueltos tras el filtrado al inicio (ej: punto inicial suelto ". According to...")
  text = text.replace(/^[\s.,;:—\-]+/, '').trim();

  // 11. Limpiar saltos de línea excesivos y espacios residuales
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 12. Escudo final: Si el texto remanente no supera el validador de seguridad, descartar por completo
  if (!isSafeUserFacingResponse(text)) {
    return '';
  }

  return text;
}

