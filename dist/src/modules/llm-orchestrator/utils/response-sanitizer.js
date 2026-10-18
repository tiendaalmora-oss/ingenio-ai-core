"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeUserFacingResponse = isSafeUserFacingResponse;
exports.sanitizeUserFacingResponse = sanitizeUserFacingResponse;
function isSafeUserFacingResponse(text) {
    if (!text || typeof text !== 'string')
        return false;
    const trimmed = text.trim();
    if (trimmed.length < 2)
        return false;
    const toolPattern = /(?:update_business_memory|create_task|pause_bot_and_handoff|handoff_to_human|schedule_meeting|default_api|tool_code|call:\w+)/i;
    if (toolPattern.test(trimmed))
        return false;
    const internalArchitecturePattern = /(?:\bKOS\b|leadStatus|lead_status|sales funnel|\bfunnel\b|METADATO INTERNO|ESTADO DEL EMBUDO|\[SYSTEM\]|\[STATE\]|\[THOUGHT\]|\[TOOL CALLS\]|\[ACTION\]|\[FINAL RESPONSE\])/i;
    if (internalArchitecturePattern.test(trimmed))
        return false;
    const funnelStatePattern = /Paso\s+\d+[:\s—\-]*(?:COMPLETADO|PENDIENTE)/i;
    if (funnelStatePattern.test(trimmed))
        return false;
    const reasoningMarkersPattern = /(?:\bAccording to\b|\bTherefore,?\s+I\b|\bThe user (?:has|is|wants)\b|\bThe script for\b|\bI need to (?:start|update)\b|\bI will use this script\b|\bI should (?:also )?(?:set|update|add)\b|\bThis request falls under\b|\btool can be used\b|\bshould be set to\b|\binterests\s*:\s*\[|\bleadStatus\s*:\s*['"]|\btags\s*:\s*\[|\bparameters?\s*:\s*\{|\bInitialize a new conversation\b)/i;
    if (reasoningMarkersPattern.test(trimmed))
        return false;
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
            if (englishCount >= 3)
                return false;
        }
    }
    return true;
}
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
    const hasScriptCitation = /(?:The script for (?:Step|Paso)\s*\d+[^:]*is:\s*|is:\s*)["“]([¡¿A-ZÁÉÍÓÚ][\s\S]+?)["”]/i.exec(text);
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
        else if (text.trim().length === 0 || !isSafeUserFacingResponse(text)) {
            text = quotedContent;
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
    text = text.replace(/^[\s.,;:—\-]+/, '').trim();
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    if (!isSafeUserFacingResponse(text)) {
        return '';
    }
    return text;
}
//# sourceMappingURL=response-sanitizer.js.map