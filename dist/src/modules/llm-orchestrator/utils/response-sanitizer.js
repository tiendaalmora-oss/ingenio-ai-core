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
    const quotedMessageMatch = text.match(/(?:The (?:first|next|welcome) message (?:in this funnel )?is:?|Response:?)\s*["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i);
    if (quotedMessageMatch && quotedMessageMatch[1]) {
        text = quotedMessageMatch[1].trim();
    }
    text = text.replace(/^(?:Initialize a new conversation[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/^(?:The user has expressed interest[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/^(?:According to the provided knowledge base[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/^(?:Based on the sales funnel[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/^(?:I will now respond[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/^(?:As an AI assistant[\s\S]*?(?=[¡¿A-ZÁÉÍÓÚ\n]))/i, '');
    text = text.replace(/\s*(?:I should also update[\s\S]*$)/i, '');
    text = text.replace(/\s*(?:I will also update[\s\S]*$)/i, '');
    text = text.replace(/\s*(?:I need to update the memory[\s\S]*$)/i, '');
    text = text.replace(/\s*(?:Note: I (?:should|will)[\s\S]*$)/i, '');
    text = text.replace(/^(?:Response|Respuesta)\s*:\s*["']?/i, '');
    text = text.replace(/^["“']|["”']$/g, '').trim();
    text = text.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');
    text = text.replace(/\[(?:IMAGEN|FOTO|CAPTURE|CAPTURA|ADJUNTO|ARCHIVO|IMAGE|PHOTO|FILE)(?:\s+DE|\s*:)?\s*[^\]]+\]/gi, '');
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}
//# sourceMappingURL=response-sanitizer.js.map