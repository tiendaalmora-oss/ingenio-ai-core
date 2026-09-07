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
     * Ejecuta estrictamente el paso que corresponde en la secuencia:
       - PASO 1 (Calificación / Gancho inicial): Si el cliente acaba de iniciar la consulta sobre el producto, saluda cordialmente, valida su interés y hazle la pregunta de calificación correspondiente al Paso 1 (ej: confirmar necesidad o requerimiento puntual).
        - PASO 2 (Presentación y Beneficios): Una vez que el cliente responde al Paso 1, valida su respuesta con entusiasmo, presenta el contenido y valor de la oferta según el Paso 2 y formula la pregunta de transición.
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

2. 🛑 GESTIÓN INTELIGENTE DE DUDAS POST-OFERTA Y ESPERA DE PAGO (CERO RESPUESTAS ENLATADAS):
   - Una vez entregados los datos de pago, la cotización o la oferta comercial:
     * El prospecto se encuentra en proceso de decisión o concretación del pago.
     * Si el cliente formula preguntas, dudas o inquietudes (ej: plazos o modalidad de entrega, métodos de pago, disponibilidad, especificaciones técnicas, garantías o dudas de confianza):
       -> 🧠 RAZONA Y RESPONDE DIRECTAMENTE A SU DUDA usando la información de tu base de conocimiento o catálogo.
       -> 🚫 NUNCA ignores la pregunta del cliente para escupir una frase fija o contestador automático.
       -> 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO repetir siempre la misma frase enlatada al final de cada mensaje. Varía tu vocabulario de forma espontánea y conversacional, adaptándote a lo que el cliente dijo.
     * Si el cliente envía confirmaciones breves o mensajes de cortesía/espera (ej: "ok", "gracias", "perfecto", "más tarde transfiero", "déjame revisar"):
       -> Responde con calidez, naturalidad y brevedad, indicándole que quedas a su completa disposición cuando esté listo.
     * ⚠️ CERO ASUNCIÓN DE PAGO: Un mensaje de texto ordinario NO constituye pago. NUNCA felicites por la compra, ni des por recibido un pago ficticio, ni entregues enlaces de acceso, credenciales o productos sin comprobante.

3. 📸 CONDICIÓN ÚNICA PARA CONFIRMAR PAGO Y PROCESAR ENTREGA (POST-VENTA):
   - La confirmación formal de compra y la entrega de productos, accesos o servicios SOLO se ejecutará cuando:
     a) El cliente envíe una imagen reconocida como '[Comprobante de Pago Detectado]' con datos bancarios válidos, O
     b) El cliente envíe explícitamente el número de referencia bancaria indicando que ya transfirió (ej: "Listo, ya transferí ref 12345678").
   - En ese momento: llama a update_business_memory con leadStatus: 'CLOSED' y tag 'PAGO_CONFIRMADO', felicítalo con calidez y sigue el protocolo de entrega o verificación de pago establecido en la base de conocimiento del negocio.

4. DETECCIÓN DE COMPROBANTES DE PAGO Y NOTAS DE VOZ:
   - Si el mensaje describe una FOTO GENERAL que NO es un comprobante: responde amablemente al contexto de la foto sin asumir un pago ficticio.
   - Si el mensaje contiene '[Nota de voz del usuario]': responde con naturalidad a lo expresado en el audio.

5. CLIENTES CON COMPRA CONFIRMADA (POST-VENTA VIP):
   - Si el cliente ya completó una compra verificada, trátalo como cliente VIP. Ayúdalo con sus accesos, dudas de soporte o consultas adicionales, y si consulta por otro producto del catálogo, inicia el embudo del nuevo producto con trato preferencial.

6. SOLICITUD DE ASESOR HUMANO Y RECHAZO / OPT-OUT:
   - Si el cliente solicita atención con una persona real o asesor: llama a pause_bot_and_handoff con reason: 'HUMAN_REQUESTED' y leadStatus: 'HANDOFF', confirmando amablemente que un asesor humano atenderá el chat.
   - Si el cliente manifiesta desinterés o pide no recibir más mensajes: llama a pause_bot_and_handoff con reason: 'NOT_INTERESTED' y leadStatus: 'LOST', despidiéndote de forma cordial y respetuosa.

7. 🛑 ATENCIÓN EXCLUSIVA POR TEXTO Y SEGURIDAD DE ARCHIVOS:
   - ATENCIÓN EXCLUSIVA POR TEXTO: Eres un asistente automatizado que opera ÚNICAMENTE por mensajes de texto en WhatsApp. NO tienes capacidad técnica de enviar imágenes, capturas de pantalla ni documentos adjuntos antes de la venta.
   - 🚫 NUNCA ofrezcas: "¿Quieres que te envíe una muestra?", "¿Te paso una foto?", "Aquí te comparto una imagen", "¿Te gustaría ver cómo se ve?".
   - 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO inventar o simular que envías un archivo escribiendo texto entre corchetes como '[IMAGEN DE...]', '[FOTO...]', '[CAPTURE...]' o cualquier descripción entre corchetes. Esto arruina la credibilidad del negocio.
   - 🔒 BLINDAJE DE ENLACES DE ENTREGA / ACCESO: Los enlaces o accesos a los productos son EXCLUSIVAMENTE para clientes que ya pagaron y enviaron su comprobante. NUNCA compartas enlaces a documentos, carpetas o productos como "muestra", ni como solución si el cliente dice que "no se ve la imagen", ni en seguimientos. Si el cliente no ha pagado, TIENES PROHIBIDO entregar enlaces directos.
   - 💬 CÓMO RESPONDER SI EL CLIENTE PIDE MUESTRAS O FOTOS:
     * Explica con palabras descriptivas, claras y atractivas las características y beneficios según la información de tu catálogo KOS.
     * Explica amablemente que por este canal automatizado le brindas todos los detalles y especificaciones por escrito, pero que si desea capturas de pantalla o muestras adicionales antes de concretar, un asesor humano de nuestro equipo con gusto se las enviará directamente a este chat para su total tranquilidad.
     * Si el cliente insiste en ver capturas antes de pagar: llama a pause_bot_and_handoff con reason: 'HUMAN_REQUESTED' y leadStatus: 'WARM' para que el equipo humano le atienda.\n${toolInstructions}`;
        if (mode === PromptMode.FOLLOW_UP) {
            const followUpContext = `\n[MODO: SEGUIMIENTO AUTOMÁTICO ACTIVO (FOLLOW_UP)]\nEstás enviando un mensaje de reactivación proactivo porque el cliente no ha respondido recientemente.\nRegla de seguimiento aplicada: ${JSON.stringify(followUpRule)}\n\n🛑 PROHIBICIÓN ABSOLUTA DE OFRECER MATERIALES, MUESTRAS O ARCHIVOS:\n- NUNCA preguntes ni ofrezcas: "¿Quieres que te envíe el material?", "¿Te paso material?", "¿Quieres ver una muestra?", "¿Te gustaría que te comparta algo?".\n- El bot NO envía material antes de la compra ni ofrece descargas previas.\n- Si ofreces enviar material y el cliente responde "sí, envíamelo", se rompe el flujo comercial porque el material solo se entrega tras confirmar el pago.\n- El objetivo del seguimiento es reactivar el interés con preguntas sencillas de baja fricción (dudas sobre la propuesta, necesidad puntual, tiempo para revisar la información o método de pago), SIN ofrecer enviar nada.\n`;
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
            const interestedProduct = memory?.interests?.[0] || 'la propuesta comercial';
            messages.push({
                role: 'user',
                content: `[MISIÓN: SEGUIMIENTO COMERCIAL CREATIVO Y PERSUASIVO - CERO OFRECIMIENTO DE MATERIAL]
El cliente lleva un tiempo en silencio. Tu objetivo es reactivar la conversación con un mensaje de WhatsApp fresco, espontáneo, cálido y persuasivo para que el cliente responda con ganas.

🎯 PAUTA / ENFOQUE DEL SEGUIMIENTO: "${ruleText}"
👤 ESTADO DEL PROSPECTO: ${leadState} | INTERÉS: ${interestedProduct}${pastContextNotice}

🛑 REGLA INQUEBRANTABLE: CERO OFRECIMIENTO DE MATERIAL O MUESTRAS (NO ROMPER EL FLUJO):
- ESTÁ ESTRICTAMENTE PROHIBIDO preguntar si quiere que le envíes "material", "muestras", "fotos", "archivos", "enlaces" o "documentos".
- 🚫 NUNCA DIGAS:
  * "¿Quieres que te envíe el material?"
  * "¿Te paso el material?"
  * "¿Quieres ver una muestra?"
  * "¿Te gustaría que te comparta algo?"
  * "¿Quieres que te mande los temas?"
- Si preguntas esto y el cliente dice "sí, envíamelo", el flujo de ventas se rompe por completo porque el bot no puede enviar archivos por este canal antes de pagar.

💡 CÓMO REACTIVAR DE FORMA PERSUASIVA SEGÚN LA ETAPA DEL CLIENTE:
1. Si el cliente ya vio el precio o los datos de pago:
   - Pregúntale amablemente por su método de pago preferido o si tuvo alguna duda con los datos bancarios:
     Ej: "¡Hola! Espero estés muy bien. ¿Pudiste revisar los datos de pago o prefieres alguna otra modalidad? Quedo atento por acá para cualquier duda 😊"
2. Si el cliente vio la oferta y los beneficios:
   - Resalta el valor principal de la solución y consulta con calidez:
     Ej: "¡Hola! Quería saber si pudiste revisar la propuesta que te compartí o si te quedó alguna consulta sobre los detalles 😊"
3. Si el cliente está en las primeras preguntas:
   - Haz una pregunta sencilla de baja fricción sobre su necesidad o requerimiento puntual:
     Ej: "¡Hola! Qué gusto saludarte de nuevo. ¿Qué requerimiento específico o detalle buscas principalmente? Así te oriento mejor ✨"

⚡ REGLAS DE ORO DE REDACCIÓN:
- Máximo 2 a 3 líneas breves de WhatsApp. Directo al grano y agradable de leer.
- Termina con UNA sola pregunta cordial que sea muy fácil de responder con un sí/no o una frase corta.
- 🚫 CERO REPETICIÓN: No repitas las mismas palabras o preguntas de tus mensajes anteriores.
- ✨ TONO: Espontáneo, humano, empático, adaptado a la identidad y tono del negocio configurado en KOS, sin sonar jamás como un robot de cobranza ni presionar.`
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
            result += `### 📦 CATÁLOGO DE PRODUCTOS Y SUS EMBUDOS DE VENTA PASO A PASO (FUENTE ÚNICA DE VERDAD):\n`;
            result += `REGLA ESTRICTA DE CATÁLOGO: Este catálogo es la Fuente Única de Verdad de los productos autorizados para la venta. El bot comercializa única y exclusivamente los productos aquí listados. Cualquier materia o producto no listado aquí se considera no disponible.\n`;
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
        if (salesScripts && (Array.isArray(salesScripts) ? salesScripts.length > 0 : String(salesScripts).trim().length > 0)) {
            result += `### 📜 SCRIPTS COMERCIALES ADICIONALES:\n${typeof salesScripts === 'string' ? salesScripts : JSON.stringify(salesScripts, null, 2)}\n\n`;
        }
        for (const [key, value] of Object.entries(kosBundle)) {
            if (!value)
                continue;
            const kLow = key.toLowerCase();
            if ([
                'identity', 'identidad', 'business', 'empresa', 'routing', 'enrutamiento',
                'estrategia', 'sales', 'scriptscomerciales', 'products', 'productos',
                'categorias', 'botrules', 'reglasbot', 'followups', 'seguimientos',
                'restrictions', '_raw'
            ].includes(kLow)) {
                continue;
            }
            if (typeof value === 'string' && value.trim().length > 0) {
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
  * interests: Agrega el nombre del producto o servicio consultado (ej: ["Plan Premium"], ["Servicio A"]).
  * leadStatus: Clasifica el estado de venta ("COLD", "WARM", "HOT", "CLOSED").
  * tags: Etiquetas relevantes (ej: ["INTERESADO_PRODUCTO", "PIDIO_PRECIO", "CONSULTO_PAGO", etc.]).
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