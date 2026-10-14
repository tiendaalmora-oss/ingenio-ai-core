"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUserFacingResponse = sanitizeUserFacingResponse;
function sanitizeUserFacingResponse(rawContent) {
    if (!rawContent || typeof rawContent !== 'string')
        return '';
    let text = rawContent.trim();
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    const finalResponseMatch = text.match(/\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]\s*:?\s*([\s\S]+)$/i);
    if (finalResponseMatch && finalResponseMatch[1]) {
        text = finalResponseMatch[1].trim();
    }
    text = text.replace(/<(?:thought|reasoning|scratchpad|inner_monologue)>[\s\S]*?<\/(?:thought|reasoning|scratchpad|inner_monologue)>/gi, '');
    text = text.replace(/\[(?:SYSTEM|STATE|THOUGHT|PENSAMIENTO|TOOL CALLS|HERRAMIENTAS|ACTION|ACCION|PLAN|REASONING)\][\s\S]*?(?=\[(?:FINAL RESPONSE|RESPUESTA FINAL|RESPONSE|RESPUESTA)\]|$)/gi, '');
    text = text.replace(/\[?(?:METADATO INTERNO DEL SISTEMA\s*-\s*|SISTEMA INTERNO\s*-\s*)?ESTADO DEL EMBUDO[^\]\n]*\]?:?/gi, '');
    text = text.replace(/^[ \t]*(?:✅|⏳|\u2705|\u23f3)?\s*(?:Estado\s+)?Paso\s+\d+[:\s—\-]*(?:COMPLETADO|PENDIENTE)[^\n]*(?:\r?\n|$)/gim, '');
    text = text.replace(/^[ \t]*(?:⏳|🟢)?\s*CLIENTE\s+(?:CALIFICADO|EN ETAPA|CONFIRMADO|EN ESPERA|REGISTRADO)[^\n]*(?:\r?\n|$)/gim, '');
    text = text.replace(/^[ \t]*🛑\s*(?:INSTRUCCI[OÓ]N|CONTROL INTERNO|CONFIDENCIAL|PROHIBIDO)(?:\s+CR[IÍ]TICA)?:?[^\n]*(?:\r?\n|$)/gim, '');
    text = text.replace(/tool_code\s*[\r\n]+(?:print\([^)]*\)\s*)*[^\n]*/gi, '');
    text = text.replace(/tool_code/gi, '');
    text = text.replace(/print\(default_api\.[^)]*\)/gi, '');
    text = text.replace(/default_api\.\w+\([^)]*\)/gi, '');
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
    const hasScriptCitation = /The script for (?:Step|Paso)\s*\d+[^:]*is:\s*["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i.exec(text);
    for (const pattern of englishPhrases) {
        text = text.replace(pattern, '');
    }
    text = text.replace(/The script for (?:Step|Paso)\s*\d+[^:]*is:\s*/gi, '');
    text = text.replace(/(?:The (?:first|next|welcome) message (?:in this funnel )?is:?|Response:?)\s*/gi, '');
    if (hasScriptCitation && hasScriptCitation[1]) {
        const quotedContent = hasScriptCitation[1].trim();
        const firstOccur = text.indexOf(quotedContent);
        const lastOccur = text.lastIndexOf(quotedContent);
        if (firstOccur !== -1 && lastOccur !== -1 && firstOccur !== lastOccur) {
            text = text.substring(lastOccur).trim();
        }
    }
    text = text.replace(/call:\w+\{[\s\S]*?(?:\}|$)/gi, '');
    text = text.replace(/call:\w+[\s\S]*$/gi, '');
    text = text.replace(/<ctrl\d+>/gi, '');
    text = text.replace(/<0x[0-9a-fA-F]+>/gi, '');
    text = text.replace(/(?:update_business_memory|create_task|pause_bot_and_handoff|handoff_to_human)\s*\{[\s\S]*?(?:\}|$)/gi, '');
    text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
    text = text.replace(/^["“']|["”']$/g, '').trim();
    text = text.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');
    text = text.replace(/\[(?:IMAGEN|FOTO|CAPTURE|CAPTURA|ADJUNTO|ARCHIVO|IMAGE|PHOTO|FILE)(?:\s+DE|\s*:)?\s*[^\]]+\]/gi, '');
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}
//# sourceMappingURL=response-sanitizer.js.map