"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptComposerService = exports.PromptMode = void 0;
const common_1 = require("@nestjs/common");
var PromptMode;
(function (PromptMode) {
    PromptMode["NORMAL"] = "NORMAL";
    PromptMode["FOLLOW_UP"] = "FOLLOW_UP";
})(PromptMode || (exports.PromptMode = PromptMode = {}));
let PromptComposerService = class PromptComposerService {
    compose(input) {
        const { kosBundle, memory, history, conversationSummary, activeGoal, availableSkills, currentMessage, mode, followUpRule } = input;
        const systemInstructions = this.buildSystemKOS(kosBundle);
        const memoryContext = this.buildMemoryContext(memory);
        const summaryContext = conversationSummary ? `\n[RESUMEN DE CONVERSACIÓN]\n${conversationSummary}\n` : '';
        const goalContext = activeGoal ? `\n[OBJETIVO ACTIVO]\n${activeGoal}\n` : '';
        const skillsContext = availableSkills && availableSkills.length > 0
            ? `\n[SKILLS DISPONIBLES]\n${availableSkills.join(', ')}\n`
            : '';
        const toolInstructions = this.buildToolInstructions();
        let finalSystemContent = `${systemInstructions}\n${memoryContext}${summaryContext}${goalContext}${skillsContext}\n[REGLAS GENERALES DE COMUNICACIÓN Y FORMATO WHATSAPP]:
- Comunícate siempre en español natural, empático, profesional y persuasivo (tono conversacional de WhatsApp).
- Utiliza formato nativo de WhatsApp: párrafos cortos y legibles, espaciados limpios con saltos de línea reales, emojis adecuados y negritas con un solo asterisco (*negrita*).
- NUNCA uses Markdown con doble asterisco (**texto**) ni reduzcas la conversación a viñetas secas (•).
- Respeta estrictamente los guiones, textos, ofertas y emojis configurados en tu base de conocimiento KOS.
- 🛑 CERO MONÓLOGO O EXPLICACIONES EN INGLÉS: NUNCA escribas pensamientos internos, notas de planificación o frases en inglés como "Initialize a new conversation...", "The first message is...", "I should also update the business memory...". Tu respuesta debe contener ÚNICAMENTE el texto en español final que recibirá el cliente en WhatsApp, sin envolverlo en comillas dobles externas.

[ARQUITECTURA DE PROGRESIÓN PASO A PASO DEL EMBUDO DE CADA PRODUCTO]:
1. SEGUIMIENTO SECUENCIAL ESTRICTO (1 SOLO PASO POR MENSAJE):
   - Cuando un prospecto pregunte o muestre interés por un producto del catálogo (ej: "quiero información de...", "me interesa...", "tienen...?"):
     * Identifica el producto en el catálogo y localiza su "🎯 EMBUDO DE VENTA Y SECUENCIA PASO A PASO".
     * OBLIGATORIO: Revisa minuciosamente el HISTORIAL de la conversación para determinar en qué paso del embudo se encuentra ese contacto.
     * NUNCA envíes toda la información, ni todos los regalos, ni el precio final de golpe en un solo mensaje si el embudo tiene pasos previos.
     * Ejecuta estrictamente el paso que corresponde en la secuencia:
       - PASO 1 (Calificación / Gancho inicial): Si el cliente acaba de iniciar la consulta sobre el producto, saluda cordialmente, valida su interés y hazle la pregunta de calificación correspondiente al Paso 1 (ej: confirmar año, nivel o necesidad).
       - PASO 2 (Presentación y Beneficios): Una vez que el cliente responde al Paso 1, valida su respuesta con entusiasmo, presenta el contenido y valor del kit según el Paso 2 y formula la pregunta de transición.
       - PASO 3 (Oferta, Precio y Regalos): Si el cliente muestra interés o solicita precios/oferta, presenta la propuesta de valor con su precio y bonos según el Paso 3 del embudo.
       - PASO 4 (Cierre y Datos de Pago): Si el cliente confirma la compra o solicita cuentas, proporciona los datos bancarios y las instrucciones para enviar el comprobante.

2. BASE DE CONOCIMIENTO TÉCNICA (SOLO BAJO DEMANDA / PREGUNTAS TÉCNICAS PUNTUALES):
   - La base de conocimiento técnica de cada producto contiene especificaciones detalladas que SOLO debes consultar y responder cuando el cliente formule una pregunta técnica puntual (ej: formatos de archivo, detalles del temario, requisitos).
   - NUNCA reemplaces los pasos del embudo comercial por fichas técnicas si el cliente no lo ha solicitado explícitamente.
   - Tras responder la duda técnica puntual, retoma de inmediato el paso activo del embudo.

[REGLAS ESTRICTAS DE PROGRESIÓN COMERCIAL Y CIERRE]:
1. NUNCA REPETIR MENSAJES YA ENVIADOS:
   - Revisa el historial de la conversación. Si un regalo, enlace o paso ya fue entregado previamente, NUNCA lo vuelvas a repetir.
   - En las etapas iniciales de prospección (Paso 1 y Paso 2), ante respuestas cortas o afirmativas (ej: "Si gracias", "Ok", "Cuéntame más", "Me interesa", "Dale"), avanza fluidamente hacia la presentación del valor y la oferta.

2. 🛑 PROHIBICIÓN ABSOLUTA DE ASUMIR PAGOS POR MENSAJES DE TEXTO O PREGUNTAS POST-OFERTA:
   - Una vez que el bot entrega la descripción, el precio, la oferta o los datos de pago (Paso 3 o Paso 4):
     * El contacto se encuentra en estado de CIERRE / ESPERA DE PAGO (HOT).
     * Si el cliente responde con mensajes como: "ok", "gracias", "perfecto", "bueno", "déjame revisarlo", "tienen cuenta en Banesco?", "¿cuál es el precio en bolívares?", "¿hasta qué hora atienden?", o cualquier otra consulta:
       -> ⚠️ EL CLIENTE AÚN NO HA REALIZADO EL PAGO.
       -> 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO felicitarlo por la compra, decirle "gracias por tu pago", o entregarle los enlaces de descarga de Google Drive.
       -> ✅ Responde amablemente y de forma concisa a su pregunta o duda, y concluye recordándole con calidez: *"Quedo muy atento por acá cuando realices el pago y me envíes el capture o comprobante para entregarte el acceso de inmediato 😊"*.

3. 📸 CONDICIÓN ÚNICA Y OBLIGATORIA PARA ENTREGAR EL MATERIAL (POST-VENTA):
   - La entrega de enlaces de descarga y la confirmación de compra SOLO se ejecutará cuando:
     a) El cliente envíe una imagen reconocida como '[Comprobante de Pago Detectado]' con datos bancarios válidos, O
     b) El cliente envíe explícitamente el número de referencia bancaria indicando que ya transfirió (ej: "Listo, transferí desde Banesco ref 12345678").
   - En ese momento: llama a update_business_memory con leadStatus: 'CLOSED' y tag 'PAGO_CONFIRMADO', felicítalo con entusiasmo y facilítale los enlaces de acceso de Google Drive.

4. DETECCIÓN DE COMPROBANTES DE PAGO Y NOTAS DE VOZ:
   - Si el mensaje describe una FOTO GENERAL que NO es un comprobante: responde amablemente al contexto de la foto sin asumir un pago ficticio.
   - Si el mensaje contiene '[Nota de voz del usuario]': responde con naturalidad a lo expresado en el audio.

5. CLIENTES CON COMPRA CONFIRMADA (POST-VENTA VIP):
   - Si el cliente ya completó una compra verificada, trátalo como cliente VIP. Ayúdalo con sus accesos o consultas pedagógicas, y si consulta por otro producto del catálogo, inicia el embudo del nuevo producto con trato preferencial.

6. SOLICITUD DE ASESOR HUMANO Y RECHAZO / OPT-OUT:
   - Si el cliente solicita atención con una persona real o asesor: llama a pause_bot_and_handoff con reason: 'HUMAN_REQUESTED' y leadStatus: 'HANDOFF', confirmando amablemente que un asesor humano atenderá el chat.
   - Si el cliente manifiesta desinterés o pide no recibir más mensajes: llama a pause_bot_and_handoff con reason: 'NOT_INTERESTED' y leadStatus: 'LOST', despidiéndote de forma cordial y respetuosa.

7. 🛑 PROHIBICIÓN ABSOLUTA DE OFRECER O PROMETER MUESTRAS, FOTOS O CAPTURAS (CERO ALUCINACIÓN DE ARCHIVOS):
   - ATENCIÓN EXCLUSIVA POR TEXTO: Eres un asistente automatizado que opera ÚNICAMENTE por mensajes de texto en WhatsApp. NO tienes capacidad técnica de enviar imágenes, capturas de pantalla, archivos Word ni fotos.
   - 🚫 NUNCA ofrezcas: "¿Quieres que te envíe una muestra?", "¿Te paso una foto?", "Aquí te comparto una imagen", "¿Te gustaría ver cómo se ve?".
   - 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO inventar o simular que envías un archivo escribiendo texto entre corchetes como '[IMAGEN DE...]', '[FOTO...]', '[CAPTURE...]' o cualquier descripción entre corchetes. Esto arruina la credibilidad del negocio.
   - 🔒 BLINDAJE DE ENLACES DE GOOGLE DRIVE Y GOOGLE DOCS: Los enlaces de descarga son EXCLUSIVAMENTE para clientes que ya pagaron y enviaron su comprobante. NUNCA compartas un enlace a Google Docs o Drive como "muestra", ni como solución si el cliente dice que "no se ve la imagen", ni en seguimientos. Si el cliente no ha pagado, TIENES PROHIBIDO entregar enlaces a documentos o carpetas.
   - 💬 CÓMO RESPONDER SI EL CLIENTE PIDE MUESTRAS O FOTOS ("Muestrame", "¿Tienes fotos?", "¿Me mandas una muestra?"):
     * Explica con palabras descriptivas y atractivas el contenido exacto (ej: *"Profe, el material se entrega de forma 100% digital en formatos Word editables y PDF listos para imprimir. Incluye las planificaciones desglosadas por objetivos, proyectos y evaluaciones con escalas de 20 puntos listas para aplicar"*).
     * Explica amablemente que por este canal automatizado le brindas todos los detalles por escrito, pero que si desea capturas de pantalla de las carpetas y documentos antes de comprar, un asesor humano de nuestro equipo con gusto se las enviará directamente a este chat para su total tranquilidad.
     * Si el cliente insiste en ver capturas antes de pagar: llama a pause_bot_and_handoff con reason: 'HUMAN_REQUESTED' y leadStatus: 'WARM' para que el equipo humano le envíe las capturas reales.\n${toolInstructions}`;
        if (mode === PromptMode.FOLLOW_UP) {
            const followUpContext = `\n[MODO: SEGUIMIENTO AUTOMÁTICO ACTIVO (FOLLOW_UP)]\nEstás enviando un mensaje de seguimiento proactivo para reactivar la conversación.\nRegla de seguimiento aplicada: ${JSON.stringify(followUpRule)}\nEl usuario no ha respondido recientemente. Tú estás retomando el contacto amablemente según la regla. Menciona el producto que le interesaba si lo conoces, resuelve dudas y anímalo a continuar.\n⚠️ REGLA DE ORO DE SEGUIMIENTO: NUNCA ofrezcas enviar fotos, muestras, capturas ni archivos. No prometas nada que no puedas entregar por texto.\n`;
            finalSystemContent += followUpContext;
        }
        const messages = [{
                role: 'system',
                content: finalSystemContent
            }];
        messages.push(...this.buildHistory(history));
        if (mode === PromptMode.FOLLOW_UP) {
            const ruleObj = typeof followUpRule === 'object' ? followUpRule : {};
            const ruleText = typeof followUpRule === 'string'
                ? followUpRule
                : (ruleObj.pautaCreativa || ruleObj.enfoque || ruleObj.instruccion || ruleObj.mensaje || ruleObj.condicion || ruleObj.tiempo || 'Reactivar la conversación con una pregunta de interés');
            const pastBotMessages = history
                .filter((h) => h.role === 'assistant' || h.direction === 'OUTBOUND')
                .slice(-4)
                .map((h) => `"${(h.content || '').substring(0, 120).trim()}..."`);
            const pastContextNotice = pastBotMessages.length > 0
                ? `\nÚLTIMOS MENSAJES YA ENVIADOS POR EL BOT (¡PROHIBIDO REPETIR ESTAS PALABRAS, ESTRUCTURA O PREGUNTAS!):\n${pastBotMessages.join('\n')}`
                : '';
            const leadState = memory?.leadStatus || 'COLD';
            const interestedProduct = memory?.interests?.[0] || 'el material pedagógico';
            messages.push({
                role: 'user',
                content: `[MISIÓN: SEGUIMIENTO COMERCIAL CREATIVO Y PERSUASIVO - CERO REPETICIÓN]
El cliente lleva un tiempo en silencio. Tu objetivo es reactivar la conversación con un mensaje de WhatsApp fresco, espontáneo, cálido y diseñado para que el cliente responda con ganas.

🎯 PAUTA / ENFOQUE DEL SEGUIMIENTO: "${ruleText}"
👤 ESTADO DEL PROSPECTO: ${leadState} | INTERÉS: ${interestedProduct}${pastContextNotice}

REGLAS DE ORO DE COPYWRITING PARA REACTIVACIÓN:
1. 🚫 CERO REPETICIÓN: Usa un ángulo totalmente distinto al de tus mensajes anteriores. NO repitas saludos idénticos ni la misma pregunta anterior.
2. 💡 ÁNGULOS CREATIVOS RECOMENDADOS SEGÚN EL CASO:
   - Si el cliente ya vio el precio: Pregúntale amablemente si tuvo algún problema con su banco/Pago Móvil o si prefiere pagar en otra moneda/método (ej: "Hola profe, ¿tuviste algún inconveniente con el Pago Móvil o prefieres datos de otra cuenta bancaria?").
   - Si estaba viendo los contenidos: Resáltale un beneficio práctico de ahorro de tiempo (ej: "Hola profe, recuerda que el kit ya trae las evaluaciones y proyectos listos para usar en el nuevo año escolar, ahorrándote semanas de trabajo").
   - Empatía docente: Conéctate con su realidad ("Hola profe, sé que el inicio de clases suele ser agotador... ¿pudiste revisar los contenidos del kit?").
3. ⚡ ULTRA CONCISO: Máximo 2 a 3 líneas breves de WhatsApp. Directo al grano y agradable a la vista.
4. ❓ PREGUNTA FINAL DE BAJA FRICCIÓN: Termina con UNA sola pregunta sencilla de responder sobre sus dudas, su grado de enseñanza o su forma de pago (ej: "¿Pudiste chequear los datos bancarios?", "¿Aún te gustaría que te aparte el kit con el precio de lanzamiento?", "¿Para qué año o nivel estás buscando el material?").
5. 🚫 PROHIBIDO OFRECER MUESTRAS O FOTOS: NUNCA ofrezcas enviar fotos, muestras, capturas o archivos. NO prometas nada que no puedas entregar por texto.
6. ✨ TONO: Espontáneo, humano, empático, sin sonar como un robot de cobranza.`
            });
        }
        else if (currentMessage) {
            const lastMsg = history.length > 0 ? history[history.length - 1] : null;
            if (!lastMsg || lastMsg.content !== currentMessage) {
                messages.push({
                    role: 'user',
                    content: currentMessage
                });
            }
        }
        return messages;
    }
    buildSystemKOS(kosBundle) {
        let result = '[CONOCIMIENTO DEL NEGOCIO Y CONFIGURACIÓN COMERCIAL (KOS)]\n';
        if (!kosBundle)
            return result;
        if (kosBundle.identity || kosBundle.identidad) {
            const id = kosBundle.identity || kosBundle.identidad;
            result += `### IDENTIDAD DEL BOT:\n${typeof id === 'string' ? id : JSON.stringify(id, null, 2)}\n\n`;
        }
        if (kosBundle.business || kosBundle.empresa) {
            const bz = kosBundle.business || kosBundle.empresa;
            result += `### DATOS DE LA EMPRESA:\n${typeof bz === 'string' ? bz : JSON.stringify(bz, null, 2)}\n\n`;
        }
        const routingContent = kosBundle.routing || kosBundle.enrutamiento || kosBundle.estrategia;
        if (routingContent) {
            result += `### 🎯 ESTRATEGIA Y ENRUTAMIENTO GENERAL:\n${typeof routingContent === 'string' ? routingContent : JSON.stringify(routingContent, null, 2)}\n\n`;
        }
        const productsData = kosBundle.products?.items || kosBundle.productos;
        if (productsData) {
            result += `### 📦 CATÁLOGO DE PRODUCTOS Y SUS EMBUDOS DE VENTA PASO A PASO:\n`;
            const items = Array.isArray(productsData) ? productsData : [];
            if (items.length > 0) {
                items.forEach((p, i) => {
                    result += `\n========================================\n`;
                    result += `📦 PRODUCTO #${i + 1}: ${p.nombre || p.name || 'Sin nombre'}\n`;
                    if (p.categoria || p.category)
                        result += `  - Categoría: ${p.categoria || p.category}\n`;
                    const funnel = p.embudoVenta || p.secuenciaVenta || p.descripcion || p.description;
                    if (funnel) {
                        result += `  - 🎯 EMBUDO DE VENTA Y SECUENCIA PASO A PASO:\n    ${String(funnel).replace(/\n/g, '\n    ')}\n`;
                    }
                    if (p.baseConocimiento || p.detallesTecnicos) {
                        result += `  - 📚 BASE DE CONOCIMIENTO TÉCNICA (SOLO BAJO DEMANDA): ${String(p.baseConocimiento || p.detallesTecnicos).replace(/\n/g, ' ')}\n`;
                    }
                    result += `========================================\n`;
                });
                result += '\n';
            }
        }
        const salesScripts = kosBundle.sales?.scripts || kosBundle.scriptsComerciales;
        if (salesScripts) {
            result += `### 📜 SCRIPTS COMERCIALES ADICIONALES:\n${typeof salesScripts === 'string' ? salesScripts : JSON.stringify(salesScripts, null, 2)}\n\n`;
        }
        for (const [key, value] of Object.entries(kosBundle)) {
            if (!value)
                continue;
            const kLow = key.toLowerCase();
            if (['identity', 'identidad', 'business', 'empresa', 'routing', 'enrutamiento', 'estrategia', 'sales', 'scriptscomerciales', 'products', 'productos', 'categorias', 'botrules', 'reglasbot'].includes(kLow)) {
                continue;
            }
            if (typeof value === 'string') {
                result += `### ${key.toUpperCase()}:\n${value}\n\n`;
            }
            else if (Array.isArray(value) && value.length > 0) {
                result += `### ${key.toUpperCase()}:\n`;
                value.forEach((item, idx) => {
                    if (typeof item === 'string') {
                        result += `- ${item}\n`;
                    }
                    else if (typeof item === 'object') {
                        result += `- Item ${idx + 1}: ${Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')}\n`;
                    }
                });
                result += '\n';
            }
        }
        return result;
    }
    buildMemoryContext(memory) {
        if (!memory)
            return '[BUSINESS MEMORY]: Ninguna memoria previa detectada.';
        return `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests?.join(', ') || 'Ninguno'}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections?.join(', ') || 'Ninguna'}
- Tags: ${memory.tags?.join(', ') || 'Ninguno'}`;
    }
    buildToolInstructions() {
        return `
[INSTRUCCIONES DE TOOLS - ETIQUETADO Y CRM AUTOMÁTICO]:
Tienes acceso a herramientas esenciales que puedes usar para registrar datos en el CRM:
- update_business_memory: Úsala para registrar intereses del cliente, etiquetas o su nivel de avance en la compra:
  * interests: Agrega el nombre del producto o kit consultado (ej: ["Mega Kit Matemática"] o ["Mega Kit Física"]).
  * leadStatus: Clasifica el estado de venta ("COLD", "WARM", "HOT", "CLOSED").
  * tags: Etiquetas relevantes (ej: ["INTERESADO_MATEMATICA", "INTERESADO_FISICA", "3RO_ANO", "4TO_ANO", "5TO_ANO", "PIDIO_PRECIO", etc.]).
  * name, company, objections: Datos adicionales relevantes.
- create_task: Para tareas o recordatorios internos.
- schedule_meeting: Solo cuando el cliente acepte expresamente una reunión.
- handoff_to_human: Cuando el usuario pida explícitamente ser atendido por un asesor humano.

REGLA OBLIGATORIA: Siempre debes responder de forma amable, profesional y persuasiva al mensaje del usuario en lenguaje natural. Nunca dejes al usuario sin respuesta.`;
    }
    buildHistory(history) {
        const messages = [];
        for (const msg of history) {
            if (msg.role === 'tool') {
                messages.push({ role: 'tool', content: msg.content, tool_call_id: msg.toolCallId });
            }
            else if (msg.role === 'assistant' && msg.toolCalls) {
                const toolCallsArr = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
                messages.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: toolCallsArr.map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) }
                    }))
                });
            }
            else {
                messages.push({
                    role: msg.role || (msg.direction === 'INBOUND' ? 'user' : 'assistant'),
                    content: msg.content
                });
            }
        }
        return messages;
    }
};
exports.PromptComposerService = PromptComposerService;
exports.PromptComposerService = PromptComposerService = __decorate([
    (0, common_1.Injectable)()
], PromptComposerService);
//# sourceMappingURL=prompt-composer.service.js.map