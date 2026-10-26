import { Injectable } from '@nestjs/common';
import { BusinessMemory, Interaction } from '@prisma/client';
import { sanitizeUserFacingResponse, isSafeUserFacingResponse } from '../utils/response-sanitizer';

export enum PromptMode {
  NORMAL = 'NORMAL',
  FOLLOW_UP = 'FOLLOW_UP'
}

export interface PromptComposerInput {
  kosBundle: any;
  memory: BusinessMemory | null;
  history: Interaction[];
  conversationSummary?: string | null;
  activeGoal?: string | null;
  availableSkills?: string[];
  currentMessage?: string | null;
  mode?: PromptMode;
  followUpRule?: any;
}

@Injectable()
export class PromptComposerService {
  
  compose(input: PromptComposerInput): any[] {
    const { kosBundle, memory, history, conversationSummary, activeGoal, availableSkills, currentMessage, mode, followUpRule } = input;
    
    // 0. Detectar el producto activo en foco (Dynamic Product Router)
    const activeProduct = this.resolveActiveProduct(kosBundle, memory, history, currentMessage);

    // 1. Build System Instructions (con priorización del producto en foco)
    const systemInstructions = this.buildSystemKOS(kosBundle, activeProduct);
    
    // 2. Build Business Memory (now also receives history, currentMessage, kosBundle, and activeProduct to detect funnel stage)
    const memoryContext = this.buildMemoryContext(memory, history, currentMessage, kosBundle, activeProduct);

    // 3. Build Summary & Goal Context
    const summaryContext = conversationSummary ? `\n[RESUMEN DE CONVERSACIÓN]\n${conversationSummary}\n` : '';
    const goalContext = activeGoal ? `\n[OBJETIVO ACTIVO]\n${activeGoal}\n` : '';
    
    // 4. Build Skills
    const skillsContext = availableSkills && availableSkills.length > 0 
      ? `\n[SKILLS DISPONIBLES]\n${availableSkills.join(', ')}\n` 
      : '';
    
    // 5. Build Tool Instructions
    const toolInstructions = this.buildToolInstructions();
    
    // 6. Combine System Message
    let finalSystemContent = `${systemInstructions}\n${memoryContext}${summaryContext}${goalContext}${skillsContext}\n[REGLAS GENERALES DE COMUNICACIÓN Y FORMATO WHATSAPP]:
- Comunícate siempre en español natural, empático, profesional y persuasivo (tono conversacional de WhatsApp).
- Utiliza formato nativo de WhatsApp: párrafos cortos y legibles, espaciados limpios con saltos de línea reales, emojis adecuados y negritas con un solo asterisco (*negrita*).
- NUNCA uses Markdown con doble asterisco (**texto**) ni reduzcas la conversación a viñetas secas (•).
- 🛑 IDIOMA 100% ESPAÑOL Y CERO MONÓLOGO DE PLANIFICACIÓN (CHAIN-OF-THOUGHT):
  * Tu comunicación hacia el cliente es 100% en ESPAÑOL. Está TERMINANTEMENTE PROHIBIDO redactar pensamientos, razonamiento en inglés, notas de planificación o introspección (ej: "According to the KOS...", "The user has...", "Therefore, I need to...", "The update_business_memory tool can be used...").
  * Si utilizas una herramienta (function call), NO agregues texto de justificación ni monólogos en el contenido. Ejecútala de forma invisible.
  * Tu respuesta hacia el usuario debe ser exclusivamente el mensaje final de WhatsApp en español, cálido, conversacional y directo, sin envolverlo en comillas externas.
- 🛑 PROHIBIDO ESCRIBIR CÓDIGO PYTHON O LLAMADAS DE HERRAMIENTAS EN EL TEXTO: NUNCA escribas "tool_code", "print(default_api...)", "call:update_business_memory..." ni código o bloques entre llaves en tu mensaje de texto. Las herramientas se ejecutan de forma invisible a través de la API nativa de function calling, NUNCA redactándolas como texto para el cliente.
- 🛑 CERO FILTRACIÓN DE METADATOS O ESTADOS DEL EMBUDO: NUNCA escribas frases de control de pasos como "Paso 1 COMPLETADO", "Paso 2 PENDIENTE", "Estado Paso...", ni reproduzcas las etiquetas de estado del embudo en tu mensaje. El cliente solo debe recibir la conversación humana y el guion comercial.
- 🛑 PROHIBICIÓN ABSOLUTA DE LLAMADAS, VIDEOLLAMADAS O REUNIONES:
  * Toda la atención y asesoría comercial se realiza 100% por este chat escrito de WhatsApp.
  * ESTÁ TERMINANTEMENTE PROHIBIDO ofrecer, proponer o agendar llamadas telefónicas, videollamadas, sesiones por Zoom/Meet o citas a una hora determinada.
  * Si el cliente solicita una llamada o reunión, indícale con amabilidad que en este momento no hay asesores telefónicos disponibles y que toda la información, demostraciones y soporte se brindan de forma inmediata por este medio escrito.
- 🛑 REGLA ESTRICTA DE COMPROBANTES HISTÓRICOS:
  * Los comprobantes de pago, imágenes o referencias bancarias que aparezcan en mensajes anteriores del historial corresponden a transacciones pasadas ya entregadas y archivadas.
  * NUNCA envíes felicitaciones ni confirmaciones de pago ("Ya registramos tu comprobante...", "En breves minutos te entregamos tu acceso...") a menos que el mensaje entrante ACTUAL del usuario contenga un nuevo comprobante recién enviado. Si el usuario está enviando una pregunta, consulta o solicitud de compra, responde exclusivamente a su mensaje actual.

[ARQUITECTURA DE PROGRESIÓN PASO A PASO DEL EMBUDO DE CADA PRODUCTO]:
1. SEGUIMIENTO SECUENCIAL ESTRICTO (1 SOLO PASO POR MENSAJE):
   - Cuando un prospecto pregunte o muestre interés por un producto del catálogo (ej: "quiero información de...", "me interesa...", "tienen...?"):
     * Identifica el producto en el catálogo y localiza su "🎯 EMBUDO DE VENTA Y SECUENCIA PASO A PASO".
     * OBLIGATORIO: Revisa minuciosamente el HISTORIAL de la conversación y el [ESTADO DEL EMBUDO] para ejecutar únicamente el paso que corresponde:
       - PASO 1 (Calificación / Gancho inicial): Si el cliente acaba de iniciar la consulta sobre el producto, saluda cordialmente, valida su interés y hazle la pregunta de calificación correspondiente al Paso 1.
       - PASO 2 (Presentación y Beneficios): Una vez que el cliente responde al Paso 1, valida su respuesta con entusiasmo, presenta el contenido y valor de la oferta según el Paso 2 (incluyendo los enlaces de demostración o regalo si están en el guion) y formula la pregunta de transición.
       - PASO 3 (Oferta, Precio y Regalos): Si el cliente muestra interés tras el Paso 2 o solicita precios/oferta directamente, presenta la propuesta de valor con su precio y bonos según el Paso 3 del embudo.
       - PASO 4 (Cierre y Datos de Pago): Si el cliente confirma la compra o solicita cuentas, proporciona los datos bancarios y las instrucciones para enviar el comprobante.

2. BASE DE CONOCIMIENTO TÉCNICA (SOLO BAJO DEMANDA / PREGUNTAS TÉCNICAS PUNTUALES):
   - La base de conocimiento técnica de cada producto contiene especificaciones detalladas que SOLO debes consultar y responder cuando el cliente formule una pregunta técnica puntual (ej: formatos de archivo, detalles del temario, requisitos, equipos compatibles).
   - NUNCA reemplaces los pasos del embudo comercial por fichas técnicas si el cliente no lo ha solicitado explícitamente.
   - Tras responder la duda técnica puntual de forma concisa, retoma de inmediato el paso activo del embudo con su pregunta de avance.

[REGLAS ESTRICTAS DE PROGRESIÓN COMERCIAL Y CIERRE]:
1. NUNCA REPETIR MENSAJES YA ENVIADOS Y RUPTURA DE BUCLES (LOOP BREAKER):
   - Revisa minuciosamente el historial de la conversación. Si un saludo, presentación, regalo, enlace, desglose de beneficios o pregunta de cierre ya fue enviado previamente, ESTÁ TERMINANTEMENTE PROHIBIDO volver a enviarlo de la misma forma o con las mismas palabras.
   - RUPTURA DE BUCLE: Si el cliente repite su respuesta anterior (ej. vuelve a decir "en casa", "gym", "info", "ok"), NO repitas la pregunta ni el paso anterior. Interpreta que el cliente reafirma su interés, reconoce su respuesta brevemente y AVANZA DE INMEDIATO al siguiente paso del embudo (por ejemplo, si ya le presentaste el producto y le preguntaste si quería conocer el precio, y vuelve a decir "en casa" o "sí", NO repitas el producto: pasa directamente a darle el precio promocional, la oferta y los métodos de pago).
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

3. 📸 CONDICIÓN ÚCA PARA CONFIRMAR PAGO Y PROCESAR ENTREGA (POST-VENTA):
   - La confirmación formal de compra y la entrega de productos, accesos o servicios SOLO se ejecutará cuando:
     a) El cliente envíe una imagen reconocida como '[Comprobante de Pago Detectado]' con datos bancarios válidos, O
     b) El cliente envíe explícitamente el número de referencia bancaria indicando que ya transfirió (ej: "Listo, ya transferí ref 12345678").
   - En ese momento: llama a update_business_memory con leadStatus: 'CLOSED' y tag 'PAGO_CONFIRMADO', felicítalo con calidez y sigue el protocolo de entrega o verificación de pago establecido en la base de conocimiento del negocio.

4. DETECCIÓN DE COMPROBANTES DE PAGO Y NOTAS DE VOZ:
   - Si el mensaje describe una FOTO GENERAL que NO es un comprobante: responde amablemente al contexto de la foto sin asumir un pago ficticio.
   - Si el mensaje contiene '[Nota de voz del usuario]': responde con naturalidad a lo expresado en el audio y continúa el paso del embudo correspondiente.

5. CLIENTES CON COMPRA CONFIRMADA (POST-VENTA VIP Y RECOMPRA):
   - Si el cliente ya completó una compra verificada, trátalo como cliente VIP de la casa.
   - Si consulta dudas sobre sus accesos o soporte de su compra anterior, asístelo amablemente y con empatía.
   - 🚫 CERO PETICIONES DE COMPROBANTE A CLIENTES QUE YA COMPRARON: Si el cliente ya pagó y tiene su acceso, NUNCA le pidas comprobantes ni capturas para el producto que ya compró. Ante respuestas breves o de cortesía ("Ok en cuenta", "Listo", "Gracias", "Buen día"), responde con un cierre cordial de atención al cliente y deseándole éxito, NUNCA digas "quedo atenta a tu comprobante".
   - Si el cliente consulta por OTRA materia o producto del catálogo, pide información o dice "Quiero", "1", "Pásame los datos" para un nuevo producto: INICIA DE INMEDIATO el flujo comercial para ese nuevo producto y proporciónale los datos de pago con total normalidad para concretar su nueva compra. La prohibición de cobrar aplica únicamente para no volver a cobrar el producto que ya pagó, NUNCA para compras de nuevos productos o combos.

6. SOLICITUD DE ASESOR HUMANO Y RECHAZO / OPT-OUT:
   - Si el cliente solicita atención con una persona real o asesor: registra en update_business_memory la etiqueta 'SOLICITA_ASESOR' y confirma amablemente que le atenderemos por este mismo medio escrito para resolver su consulta de inmediato.
   - Si el cliente manifiesta desinterés explícito o pide no recibir más mensajes: despídete de forma cordial y respetuosa.

7. 🛑 ATENCIÓN EXCLUSIVA POR TEXTO Y SEGURIDAD DE ARCHIVOS:
   - ATENCIÓN EXCLUSIVA POR TEXTO: Eres un asistente automatizado que opera ÚNICAMENTE por mensajes de texto en WhatsApp. NO tienes capacidad técnica de enviar imágenes, capturas de pantalla ni documentos adjuntos antes de la venta.
   - 🚫 NUNCA ofrezcas: "¿Quieres que te envíe una muestra?", "¿Te paso una foto?", "Aquí te comparto una imagen", "¿Te gustaría ver cómo se ve?".
   - 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO inventar o simular que envías un archivo escribiendo texto entre corchetes como '[IMAGEN DE...]', '[FOTO...]', '[CAPTURE...]' o cualquier descripción entre corchetes. Esto arruina la credibilidad del negocio.
   - 🔒 BLINDAJE DE ENLACES DE ENTREGA FINAL: Los enlaces de entrega final y acceso al producto pagado completo son EXCLUSIVAMENTE para clientes que ya pagaron y enviaron su comprobante. NUNCA compartas enlaces a carpetas completas de productos pagados como "muestra" no autorizada, ni inventes enlaces inexistentes.
   - ✅ ENLACES AUTORIZADOS DEL EMBUDO (REGALOS Y PÁGINAS WEB): Si el embudo de un producto o la base de conocimiento incluye expresamente un enlace de regalo gratuito (ej: muestra/diplomas de obsequio en Google Drive) o el enlace de la página web oficial (landing page en os.ingeniodigital.shop o similar), DEBES incluir exactamente el enlace correspondiente tal como está indicado en el guion del embudo.
   - 💬 CÓMO RESPONDER SI EL CLIENTE PIDE MUESTRAS O FOTOS:
     * Explica con palabras descriptivas, claras y atractivas las características y beneficios según la información de tu catálogo KOS, y comparte el enlace de la página de demostración si el embudo del producto lo incluye.
     * Explica amablemente que por este canal le brindas todos los detalles y especificaciones por escrito.\n${toolInstructions}`;

    if (mode === PromptMode.FOLLOW_UP) {
      const followUpContext = `\n[MODO: SEGUIMIENTO AUTOMÁTICO ACTIVO (FOLLOW_UP)]\nEstás enviando un mensaje de reactivación proactivo porque el cliente no ha respondido recientemente.\nRegla de seguimiento aplicada: ${JSON.stringify(followUpRule)}\n\n🛑 PROHIBICIÓN ABSOLUTA DE OFRECER MATERIALES, MUESTRAS O ARCHIVOS:\n- NUNCA preguntes ni ofrezcas: "¿Quieres que te envíe el material?", "¿Te paso material?", "¿Quieres ver una muestra?", "¿Te gustaría que te comparta algo?".\n- El bot NO envía material antes de la compra ni ofrece descargas previas.\n- Si ofreces enviar material y el cliente responde "sí, envíamelo", se rompe el flujo comercial porque el material solo se entrega tras confirmar el pago.\n- El objetivo del seguimiento es reactivar el interés con preguntas sencillas de baja fricción (dudas sobre la propuesta, necesidad puntual, tiempo para revisar la información o método de pago), SIN ofrecer enviar nada.\n`;
      finalSystemContent += followUpContext;
    }

    // Extraer los últimos mensajes que envió el bot para el escudo anti-repetición universal en todos los modos
    const pastBotMessages = history
      .filter((h: any) => h.role === 'assistant' || h.direction === 'OUTBOUND')
      .filter((h: any) => h.type !== 'TOOL_CALL')
      .filter((h: any) => h.content && h.content.trim() !== '')
      .map((h: any) => sanitizeUserFacingResponse(h.content))
      .filter((text: string) => isSafeUserFacingResponse(text))
      .slice(-4)
      .map((text: string) => `"${text.replace(/\n/g, ' ').substring(0, 160).trim()}..."`);

    if (pastBotMessages.length > 0) {
      finalSystemContent += `\n[ESCUDO ANTI-REPETICIÓN Y RUPTURA DE BUCLES (LOOP BREAKER)]:\nÚLTIMOS MENSAJES YA ENVIADOS POR EL ASISTENTE EN ESTA CONVERSACIÓN:\n${pastBotMessages.join('\n')}\n\n🛑 REGLAS INQUEBRANTABLES DE FLUIDEZ Y NO REPETICIÓN:\n1. ESTÁ TERMINANTEMENTE PROHIBIDO repetir el mismo mensaje, saludo, listado de viñetas, características o pregunta de cierre que ya enviaste previamente.\n2. RUPTURA DE BUCLE (LOOP BREAKER): Si el usuario repite su respuesta, da una respuesta corta o insiste con la misma opción (ej: vuelve a decir "en casa", "gym", "info", "ok"): NO vuelvas a enviar la presentación ni el filtro. Reconoce brevemente lo que dijo con entusiasmo y AVANZA DE INMEDIATO al siguiente paso del embudo comercial (presenta el precio promocional o pasa a los datos de pago).\n3. Si ya preguntaste en tu turno anterior si quería conocer el precio o la oferta y el usuario vuelve a responder, NO repitas la pregunta: dale directamente el precio promocional y las facilidades de pago.\n4. Cada intervención debe sentirse fresca, natural, humana y orientada a hacer progresar la venta hacia el cierre.\n`;
    }

    const messages: any[] = [{
      role: 'system',
      content: finalSystemContent
    }];
    
    // 7. Build History
    messages.push(...this.buildHistory(history));

    // 8. Add Current Message or Follow-Up trigger
    if (mode === PromptMode.FOLLOW_UP) {
      const ruleObj = typeof followUpRule === 'object' ? followUpRule : {};
      const parts: string[] = [];
      if (ruleObj.tiempo) parts.push(`- Momento de activación: ${ruleObj.tiempo} de inactividad del cliente`);
      if (ruleObj.enfoque) parts.push(`- 🎯 Ángulo / Enfoque Comercial: ${ruleObj.enfoque}`);
      if (ruleObj.pautaCreativa) parts.push(`- 💡 Pauta Creativa: ${ruleObj.pautaCreativa}`);
      if (ruleObj.instruccion) parts.push(`- 📋 Instrucción Adicional: ${ruleObj.instruccion}`);
      if (ruleObj.mensaje) parts.push(`- 💬 Mensaje o Guion de Referencia: ${ruleObj.mensaje}`);

      const ruleText = typeof followUpRule === 'string'
        ? followUpRule
        : (parts.length > 0 ? parts.join('\n') : (ruleObj.condicion || '- Reactivar la conversación cordialmente con empatía'));

      // Extraer los últimos mensajes que envió el bot para prohibir repeticiones
      const pastFollowUpBotMessages = history
        .filter((h: any) => h.role === 'assistant' || h.direction === 'OUTBOUND')
        .filter((h: any) => h.type !== 'TOOL_CALL')
        .filter((h: any) => h.content && h.content.trim() !== '')
        .map((h: any) => sanitizeUserFacingResponse(h.content))
        .filter((text: string) => isSafeUserFacingResponse(text))
        .slice(-4)
        .map((text: string) => `"${text.substring(0, 120).trim()}..."`);

      const pastContextNotice = pastFollowUpBotMessages.length > 0
        ? `\nÚLTIMOS MENSAJES YA ENVIADOS POR EL BOT (¡PROHIBIDO REPETIR ESTAS PALABRAS, ESTRUCTURA O PREGUNTAS!):\n${pastFollowUpBotMessages.join('\n')}`
        : '';

      const leadState = memory?.leadStatus || 'COLD';
      const interestedProduct = activeProduct?.nombre || activeProduct?.name || memory?.interests?.[0] || 'la propuesta comercial';

      messages.push({
        role: 'user',
        content: `[MISIÓN: SEGUIMIENTO COMERCIAL CREATIVO Y PERSUASIVO - CERO OFRECIMIENTO DE MATERIAL]
El cliente lleva un tiempo en silencio. Tu objetivo es reactivar la conversación con un mensaje de WhatsApp fresco, espontáneo, cálido y persuasivo para que el cliente responda con ganas.

🎯 CONFIGURACIÓN Y PAUTA DEL SEGUIMIENTO:
${ruleText}
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

💡 CÓMO REACTIVAR DE FORMA PERSUASIVA Y NATURAL:
1. Si han transcurrido varios días o semanas (ej. 15 días):
   - Saluda con calidez reconociendo con simpatía el tiempo pasado (el ajetreo diario, inicio de año escolar o compromisos).
   - Recuerda con sutileza y entusiasmo el kit o área que estaban conversando, invitándolo a retomar con tranquilidad.
2. Si el cliente ya había visto los datos de pago:
   - Pregúntale amablemente si tuvo alguna duda con el método de pago o si prefiere otra alternativa para apoyarlo.
3. 🚫 PROHIBIDO CLONAR PLANTILLAS:
   - NUNCA repitas frases mecánicas como "¿Pudiste revisar la información que te compartí o te quedó alguna consulta sobre los detalles?".
   - Redacta de forma única, fluida y humana inspirada en la pauta comercial.

⚡ REGLAS DE ORO DE REDACCIÓN:
- Máximo 2 a 3 líneas breves de WhatsApp. Directo al grano y agradable de leer.
- Termina con UNA sola pregunta cordial que sea muy fácil de responder con un sí/no o una frase corta.
- 🚫 CERO REPETICIÓN: No repitas las mismas palabras o preguntas de tus mensajes anteriores.
- ✨ TONO: Espontáneo, humano, empático, adaptado a la identidad y tono del negocio configurado en KOS, sin sonar jamás como un robot de cobranza ni presionar.`
      });
    } else if (currentMessage) {
      // Evitar duplicar el mensaje del usuario si ya está registrado en el historial (incluso si después hubo un TOOL_CALL / TOOL_RESULT)
      const userMessagesInHistory = history.filter(
        (h: any) => h.role === 'user' || (h.direction === 'INBOUND' && h.type !== 'TOOL_RESULT' && h.role !== 'tool')
      );
      const lastUserMsg = userMessagesInHistory.length > 0 ? userMessagesInHistory[userMessagesInHistory.length - 1] : null;
      if (!lastUserMsg || lastUserMsg.content !== currentMessage) {
        messages.push({
          role: 'user',
          content: currentMessage
        });
      }
    }
    
    return messages;
  }

  /**
   * Normaliza texto eliminando tildes y signos para comparaciones deterministas de catálogo.
   */
  private normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detecta dinámicamente cuál es el producto del catálogo KOS que está actualmente en foco
   * evaluando: 1) mensaje actual del cliente, 2) memoria de intereses, 3) últimos mensajes entrantes.
   */
  private resolveActiveProduct(kosBundle: any, memory: BusinessMemory | null, history: any[] = [], currentMessage?: string | null): any | null {
    const productsData = kosBundle?.products?.items || kosBundle?.productos;
    const items: any[] = Array.isArray(productsData) ? productsData : [];
    if (items.length === 0) return null;
    if (items.length === 1) return items[0];

    const stopWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'para', 'por', 'un', 'una', 'kit', 'mega', 'pack', 'sistema', 'metodo', 'curso', 'programa', 'pro', '2025', '2026', 'control', 'docente']);

    const matchProductInText = (rawText: string): any | null => {
      const normText = this.normalizeText(rawText);
      if (!normText) return null;

      // 1. Coincidencia por nombre completo normalizado
      for (const item of items) {
        const prodName = this.normalizeText(item.nombre || item.name || '');
        if (prodName && normText.includes(prodName)) {
          return item;
        }
      }

      // 2. Coincidencia por palabras clave distintivas del nombre o categoría
      let bestMatch: any = null;
      let bestScore = 0;

      for (const item of items) {
        const prodName = this.normalizeText(item.nombre || item.name || '');
        const prodCat = this.normalizeText(item.categoria || item.category || '');
        const tokens = `${prodName} ${prodCat}`
          .split(' ')
          .filter(t => t.length >= 3 && !stopWords.has(t));

        let score = 0;
        for (const token of tokens) {
          const regex = new RegExp(`\\b${token}`, 'i');
          if (regex.test(normText)) {
            score += token.length >= 5 ? 2 : 1;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = item;
        }
      }

      return bestScore > 0 ? bestMatch : null;
    };

    // Prioridad 1: Mensaje entrante actual (si menciona explícitamente un producto, ej: anuncio de Facebook)
    if (currentMessage) {
      const fromCurrent = matchProductInText(currentMessage);
      if (fromCurrent) return fromCurrent;
    }

    // Prioridad 2: Últimos mensajes entrantes del usuario en la conversación
    const inboundHistory = [...(history || [])]
      .filter((h: any) => h.direction === 'INBOUND' || h.role === 'user')
      .reverse();
    for (const msg of inboundHistory.slice(0, 5)) {
      const fromHistory = matchProductInText(msg.content || '');
      if (fromHistory) return fromHistory;
    }

    // Prioridad 3: Intereses registrados en BusinessMemory (interests[0] es el más reciente)
    if (memory?.interests && Array.isArray(memory.interests)) {
      for (const interest of memory.interests) {
        const fromMemory = matchProductInText(interest);
        if (fromMemory) return fromMemory;
      }
    }

    return null;
  }
  
  private buildSystemKOS(kosBundle: any, activeProduct?: any | null): string {
    let result = '[CONOCIMIENTO DEL NEGOCIO Y CONFIGURACIÓN COMERCIAL (KOS)]\n';
    if (!kosBundle) return result;

    // 1. Identidad y Empresa
    if (kosBundle.identity || kosBundle.identidad) {
      const id = kosBundle.identity || kosBundle.identidad;
      result += `### IDENTIDAD DEL BOT:\n${typeof id === 'string' ? id : JSON.stringify(id, null, 2)}\n\n`;
    }
    if (kosBundle.business || kosBundle.empresa) {
      const bz = kosBundle.business || kosBundle.empresa;
      result += `### DATOS DE LA EMPRESA:\n${typeof bz === 'string' ? bz : JSON.stringify(bz, null, 2)}\n\n`;
    }

    // 2. Estrategia y Enrutamiento Global
    const routingContent = kosBundle.routing || kosBundle.enrutamiento || kosBundle.estrategia;
    if (routingContent) {
      result += `### 🎯 ESTRATEGIA Y ENRUTAMIENTO GENERAL:\n${typeof routingContent === 'string' ? routingContent : JSON.stringify(routingContent, null, 2)}\n\n`;
    }

    // 3. Catálogo de Productos y sus Embudos de Venta Paso a Paso (con Enrutamiento Dinámico en Foco)
    const productsData = kosBundle.products?.items || kosBundle.productos;
    if (productsData) {
      result += `### 📦 CATÁLOGO DE PRODUCTOS Y SUS EMBUDOS DE VENTA PASO A PASO (FUENTE ÚNICA DE VERDAD):\n`;
      result += `REGLA ESTRICTA DE CATÁLOGO: Este catálogo es la Fuente Única de Verdad de los productos autorizados para la venta. El bot comercializa única y exclusivamente los productos aquí listados. Cualquier materia o producto no listado aquí se considera no disponible.\n`;
      const items = Array.isArray(productsData) ? productsData : [];

      if (activeProduct) {
        const activeName = activeProduct.nombre || activeProduct.name;
        result += `\n🎯 [PRODUCTO ACTIVO EN FOCO EN ESTA CONVERSACIÓN]: "${activeName}"\n`;
        result += `🛑 DIRECTIVA DE FOCO: El cliente está consultando actualmente por "${activeName}". Utiliza EXCLUSIVAMENTE el embudo, precios, enlaces y beneficios de "${activeName}". NO mezcles información de otros productos a menos que el cliente pregunte expresamente por otro.\n`;
      }

      if (items.length > 0) {
        items.forEach((p: any, i: number) => {
          const pName = p.nombre || p.name || 'Sin nombre';
          const isFocused = activeProduct && (pName === (activeProduct.nombre || activeProduct.name));
          result += `\n========================================\n`;
          result += `📦 PRODUCTO #${i + 1}${isFocused ? ' ⭐ [PRODUCTO ACTIVO DEL CLIENTE]' : ''}: ${pName}\n`;
          if (p.categoria || p.category) result += `  - Categoría: ${p.categoria || p.category}\n`;
          
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

    // 4. Scripts Comerciales
    const salesScripts = kosBundle.sales?.scripts || kosBundle.scriptsComerciales;
    if (salesScripts && (Array.isArray(salesScripts) ? salesScripts.length > 0 : String(salesScripts).trim().length > 0)) {
      result += `### 📜 SCRIPTS COMERCIALES ADICIONALES:\n${typeof salesScripts === 'string' ? salesScripts : JSON.stringify(salesScripts, null, 2)}\n\n`;
    }

    // 5. Resto de secciones (Faqs, Objeciones, Promociones, Políticas)
    for (const [key, value] of Object.entries(kosBundle)) {
      if (!value) continue;
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
      } else if (Array.isArray(value) && value.length > 0) {
        result += `### ${key.toUpperCase()}:\n`;
        value.forEach((item, idx) => {
          if (typeof item === 'string') {
            result += `- ${item}\n`;
          } else if (typeof item === 'object') {
            result += `- Item ${idx + 1}: ${Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')}\n`;
          }
        });
        result += '\n';
      }
    }

    return result;
  }
  
  private buildMemoryContext(
    memory: BusinessMemory | null,
    history?: any[],
    currentMessage?: string | null,
    kosBundle?: any,
    activeProduct?: any | null
  ): string {
    const activeProductName = activeProduct ? (activeProduct.nombre || activeProduct.name) : null;
    const focusLine = activeProductName
      ? `\n- 🎯 Producto Activo en Foco: ${activeProductName} (Mantén la conversación sobre este producto y su embudo)`
      : '';

    if (!memory && (!history || history.length === 0)) {
      return `[BUSINESS MEMORY]: Ninguna memoria previa detectada.${focusLine}\n[ESTADO DEL EMBUDO]: INICIO — El cliente está llegando por primera vez. Inicia con saludo y calificación (Paso 1).`;
    }
    
    const baseMemory = memory
      ? `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests?.join(', ') || activeProductName || 'Ninguno'}${focusLine}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections?.join(', ') || 'Ninguna'}
- Tags: ${memory.tags?.join(', ') || 'Ninguno'}`
      : `[BUSINESS MEMORY]: Sin registro previo en CRM.${focusLine}`;

    // Detectar el paso del embudo basado en el historial de la conversación
    const funnelState = this.detectFunnelState(history || [], memory, currentMessage, kosBundle, activeProduct);
    
    return `${baseMemory}\n\n${funnelState}`;
  }

  /**
   * Detecta de forma determinista y sin falsos positivos en qué paso del embudo se encuentra el cliente
   * analizando el historial de mensajes OUTBOUND del ciclo activo de venta y las señales del catálogo.
   */
  private detectFunnelState(
    history: any[],
    memory: BusinessMemory | null,
    currentMessage?: string | null,
    kosBundle?: any,
    activeProduct?: any | null
  ): string {
    // 1. Detectar si hubo un comprobante o pago confirmado en el historial previo
    let lastPaymentIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      const content = (h.content || '').toLowerCase();
      if (
        content.includes('[comprobante de pago') ||
        content.includes('ya registramos tu comprobante') ||
        content.includes('registramos tu pago') ||
        content.includes('pago confirmado') ||
        (Array.isArray(h.toolCalls) && h.toolCalls.some((tc: any) => tc.arguments?.tags?.includes('PAGO_CONFIRMADO')))
      ) {
        lastPaymentIdx = i;
        break;
      }
    }

    // El ciclo de venta activo corresponde a las interacciones DESPUÉS del último pago confirmado
    const activeHistory = lastPaymentIdx >= 0 ? history.slice(lastPaymentIdx + 1) : history;

    const outbound = activeHistory.filter((h: any) => 
      (h.direction === 'OUTBOUND' || h.role === 'assistant') &&
      h.type !== 'TOOL_CALL' &&
      (h.content || '').trim().length > 0
    );

    const memStatus = (memory?.leadStatus || '').toUpperCase();
    const memTags = Array.isArray(memory?.tags)
      ? (memory.tags as string[]).map(t => String(t).toUpperCase())
      : [];

    const isPaid = ['CLOSED', 'CLIENT', 'CLIENTE', 'SALE', 'VENTA', 'PAGADO'].includes(memStatus) ||
                   memTags.some(t => ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO', 'PAGADO', 'CLIENTE', 'ACCESO_ENTREGADO', 'VENTA_CERRADA'].includes(t)) ||
                   history.some((h: any) => (h.content || '').includes('Comprobante de Pago Detectado') || (h.content || '').includes('Venta manual confirmada'));

    // Paso 1 está COMPLETADO si el bot ya envió al menos un mensaje conversacional en este ciclo activo
    const paso1Done = outbound.length >= 1;
    
    // Paso 2 (Presentación de valor, contenido, módulos, beneficios o enlace de demostración)
    // Requiere estructura de presentación real (no simples saludos cortos)
    const paso2Raw = outbound.some((h: any) => {
      const c = (h.content || '').toLowerCase();
      if (c.length < 80 && !c.includes('mega kit') && !c.includes('ingeniodigital.shop')) return false;
      return c.includes('todo lo que recibes') || c.includes('evaluaciones') || 
             c.includes('planificaciones') || c.includes('mega kit') || 
             c.includes('kit docente') || c.includes('beneficios') ||
             c.includes('regalos exclusivos') || c.includes('te gustaría ver') ||
             c.includes('mega pack') || c.includes('rutinas') || c.includes('módulos') ||
             c.includes('modulos') || c.includes('acceso de por vida') ||
             c.includes('organizado en') || c.includes('ingeniodigital.shop') ||
             c.includes('inventario') || c.includes('facturación') || c.includes('facturacion') ||
             c.includes('control total') || c.includes('sistema') || c.includes('incluye:');
    });
    
    // Paso 3 (Oferta comercial con monto numérico y divisa explícita o condiciones de precio/inversión)
    // Evita falsos positivos cuando solo se menciona la palabra "precio" en una pregunta de transición
    const paso3Raw = outbound.some((h: any) => {
      const c = (h.content || '').toLowerCase();
      const hasExplicitPriceQuote = /(?:\d+[\s.,]*\d*\s*(?:bs|bolivares|usd|usdt|\$|dolares))|(?:\$\s*\d+)/i.test(c);
      const hasOfferBlock = (c.includes('pago único') || c.includes('pago unico') || c.includes('precio promocional') || c.includes('inversión única') || c.includes('inversion unica')) && !c.endsWith('precio?');
      return hasExplicitPriceQuote || hasOfferBlock;
    });
    
    // Paso 4 (Coordenadas bancarias o datos de pago reales entregados)
    // Evita falsos positivos con frases como "ten en cuenta" o "cuentas por cobrar"
    const paso4Raw = outbound.some((h: any) => {
      const c = (h.content || '').toLowerCase();
      return c.includes('datos de pago') || c.includes('pago móvil') ||
             c.includes('pago movil') || c.includes('cédula:') || c.includes('cedula:') ||
             c.includes('titular:') || c.includes('0102') || c.includes('rif:') ||
             (c.includes('banco') && (c.includes('cédula') || c.includes('cedula') || c.includes('teléfono') || c.includes('telefono') || c.includes('0412') || c.includes('0414') || c.includes('0424')));
    });

    // Garantizar monotonicidad lógica de etapas (si ya entregó datos de pago -> pasos 1..3 completados; si ya cotizó precio -> pasos 1..2 completados)
    const paso4Done = paso4Raw;
    const paso3Done = paso3Raw || paso4Done;
    const paso2Done = paso2Raw || paso3Done;

    // Detectar si un cliente pagador está consultando soporte o en proceso de RECOMPRA / VENTA CRUZADA
    const recentInboundText = [
      ...activeHistory.filter((h: any) => h.direction === 'INBOUND' || h.role === 'user').map((h: any) => h.content || ''),
      currentMessage || ''
    ].join(' ').toLowerCase();

    const isSupportInquiry = 
      recentInboundText.includes('no me abre') ||
      recentInboundText.includes('no puedo entrar') ||
      recentInboundText.includes('no me llegó') ||
      recentInboundText.includes('no me llego') ||
      recentInboundText.includes('problema con el drive') ||
      recentInboundText.includes('acceso al drive') ||
      recentInboundText.includes('mi correo') ||
      recentInboundText.includes('no puedo descargar');

    // Extraer palabras clave dinámicas de todos los productos del tenant
    const dynamicProductKeywords: string[] = [];
    const productsData = kosBundle?.products?.items || kosBundle?.productos;
    if (Array.isArray(productsData)) {
      for (const p of productsData) {
        const pName = this.normalizeText(p.nombre || p.name || '');
        if (pName) {
          dynamicProductKeywords.push(pName);
          for (const token of pName.split(' ')) {
            if (token.length >= 4 && !['para', 'como', 'este', 'todo', '2025', '2026'].includes(token)) {
              dynamicProductKeywords.push(token);
            }
          }
        }
      }
    }

    const normRecentInbound = this.normalizeText(recentInboundText);

    const hasBuyOrProductIntent = 
      recentInboundText.includes('quiero') ||
      recentInboundText.includes('comprar') ||
      recentInboundText.includes('precio') ||
      recentInboundText.includes('costo') ||
      recentInboundText.includes('como pago') ||
      recentInboundText.includes('cómo pago') ||
      recentInboundText.includes('datos de pago') ||
      recentInboundText.includes('pasame los datos') ||
      recentInboundText.includes('pásame los datos') ||
      (currentMessage || '').trim() === '1' ||
      (currentMessage || '').trim().toLowerCase() === 'quiero 1' ||
      recentInboundText.includes('quimica') || recentInboundText.includes('química') ||
      recentInboundText.includes('fisica') || recentInboundText.includes('física') ||
      recentInboundText.includes('matematica') || recentInboundText.includes('matemática') ||
      recentInboundText.includes('biologia') || recentInboundText.includes('biología') ||
      recentInboundText.includes('ingles') || recentInboundText.includes('inglés') ||
      recentInboundText.includes('preescolar') || recentInboundText.includes('bachillerato') ||
      recentInboundText.includes('repuestera') || recentInboundText.includes('farmacia') ||
      recentInboundText.includes('entrenador') || recentInboundText.includes('gym') ||
      recentInboundText.includes('combo') || recentInboundText.includes('otro kit') ||
      recentInboundText.includes('otra materia') ||
      dynamicProductKeywords.some(kw => kw.length >= 4 && normRecentInbound.includes(kw));

    const isRepurchaseOrNewInquiry = isPaid && hasBuyOrProductIntent && !isSupportInquiry;
    const activeProductName = activeProduct ? (activeProduct.nombre || activeProduct.name) : null;

    let stateLines: string[] = [
      '[METADATO INTERNO DEL SISTEMA - ESTADO DEL EMBUDO]:',
      '🛑 CONFIDENCIAL / PROHIBIDO CITAR AL CLIENTE: Las siguientes líneas son notas internas del CRM para tu control de flujo. JAMÁS las transcribas, copies ni menciones en tu mensaje al cliente. PROHIBIDO razonar en inglés o citar estos estados en voz alta: utilízalos internamente para seleccionar tu respuesta directa en español.',
    ];

    if (activeProductName) {
      stateLines.push(`🎯 Producto en Foco: ${activeProductName}`);
    }
    
    stateLines.push(paso1Done ? 'Estado Paso 1: COMPLETADO (Calificación inicial ya realizada).' : 'Estado Paso 1: PENDIENTE (Calificación inicial).');
    stateLines.push(paso2Done ? 'Estado Paso 2: COMPLETADO (Presentación del producto ya enviada).' : 'Estado Paso 2: PENDIENTE (Presentación del producto).');
    stateLines.push(paso3Done ? 'Estado Paso 3: COMPLETADO (Oferta y precio ya enviados).' : 'Estado Paso 3: PENDIENTE (Oferta y precio).');
    stateLines.push(paso4Done ? 'Estado Paso 4: COMPLETADO (Datos de pago ya entregados).' : 'Estado Paso 4: PENDIENTE (Datos de pago).');
    
    // Construir la instrucción según el paso actual
    let instruction = '';
    
    if (isRepurchaseOrNewInquiry) {
      if (paso4Done) {
        instruction = `\n🟢 CLIENTE REGISTRADO VIP / RECOMPRA — DATOS DE PAGO ENTREGADOS.\n🛑 INSTRUCCIÓN CRÍTICA:\n- Los datos de pago para su nueva compra ya fueron entregados.\n- Responde amablemente a cualquier duda técnica o método de pago y queda atento a su nuevo comprobante.`;
      } else if (paso3Done) {
        instruction = `\n🟢 CLIENTE REGISTRADO VIP / RECOMPRA — EN ETAPA DE CIERRE.\n🛑 INSTRUCCIÓN CRÍTICA: La oferta para el nuevo producto ya fue presentada. Si el cliente confirma la compra diciendo "Quiero", "1", "Pásame los datos" o similar: ENTREGA DE INMEDIATO los datos oficiales de Pago Móvil / Binance para que concrete su nueva materia con total normalidad. (La prohibición de cobrar aplica únicamente a su compra vieja ya pagada, NUNCA a una nueva materia).`;
      } else if (paso2Done) {
        instruction = `\n🟢 CLIENTE REGISTRADO VIP / RECOMPRA — EN ETAPA DE PRESENTACIÓN.\n🛑 INSTRUCCIÓN CRÍTICA: Presenta la oferta con precio y bonos para la nueva materia o combo de su interés.`;
      } else {
        instruction = `\n🟢 CLIENTE REGISTRADO VIP / RECOMPRA DE NUEVA MATERIA O CONSULTA COMERCIAL.
🛑 INSTRUCCIÓN CRÍTICA DE RECOMPRA Y VENTA CRUZADA:
- Este cliente ya es cliente verificado de la casa y ahora desea consultar o adquirir una NUEVA materia o combo del catálogo.
- Trátalo con calidez y reconocimiento como cliente VIP.
- 🛑 CERO CONFIRMACIONES VIEJAS: NO reenvíes felicitaciones ni confirmaciones de pagos antiguos del historial.
- Si pregunta por una nueva materia: preséntale su información, enlaces y precio directamente sin reiniciar el saludo.
- Si el cliente confirma la compra diciendo "Quiero", "1", "Pásame los datos" o similar: ENTREGA DE INMEDIATO los datos de pago oficiales para su nueva compra con total normalidad.`;
      }
    } else if (isPaid) {
      instruction = `\n🟢 CLIENTE CONFIRMADO COMO PAGADOR / COMPRADOR VERIFICADO.
🛑 INSTRUCCIÓN CRÍTICA DE POST-VENTA:
- Este usuario YA compró, pagó y tiene confirmado su material.
- 🚫 PROHIBICIÓN ABSOLUTA: NUNCA le pidas comprobantes de pago, datos de transferencias ni capturas de pantalla para este producto. NUNCA asumas que tiene un pago pendiente.
- 🚫 ESTÁ ESTRICTAMENTE PROHIBIDO aplicar la "Situación A" del Paso 5 del embudo comercial (no le digas "quedo atenta a tu comprobante cuando lo tengas listo").
- Si el cliente envía confirmaciones o cortesías ("Ok en cuenta", "gracias", "listo", "excelente", "bueno"): responde con un cierre cordial de atención al cliente, agradeciendo su confianza y deseándole un feliz día/año escolar.
- Si consulta sobre sus accesos, enlaces o soporte, asístelo amablemente. Trátalo como VIP. Si en cambio desea adquirir OTRA materia o un combo adicional, guíalo en su nueva compra con trato preferencial.`;
    } else if (paso4Done) {
      instruction = `\n⏳ CLIENTE EN ESPERA DE PAGO — Los datos de pago ya fueron entregados.
🛑 INSTRUCCIONES CRÍTICAS:
- Responde ÚNICAMENTE a lo que el cliente preguntó en este mensaje. No re-envíes el pitch ni los datos ya entregados.
- Si el cliente dice "no me llegó nada": pregúntale qué parte específica no recibió. NO re-envíes todo el catálogo automáticamente.
- Si el cliente tiene una duda técnica o sobre pasarelas/divisas (Zelle, Binance, PayPal, Zinli, Pago Móvil, Nequi, transferencias): respóndela directo con tu base de conocimiento.
- Si el cliente dice "ok", "gracias", "ahora pago", "hoy puedo pagarlo", "voy a transferir", "dame chance" o promesas similares a futuro: confirma brevemente con calidez que quedas muy atento a su comprobante cuando realice la transferencia. 🚫 PROHIBICIÓN ABSOLUTA: JAMÁS envíes felicitaciones ni confirmaciones de pago ("Ya registramos tu comprobante...", "En breves minutos te entregamos tu acceso...") ni asumas que ya pagó hasta que el cliente realmente envíe la captura o la referencia bancaria en el chat.
- 🚫 PROHIBIDO: Volver a presentar el producto completo, los beneficios detallados ni el precio si ya fueron enviados.`;
    } else if (paso3Done) {
      instruction = `\n⏳ CLIENTE EN ETAPA DE CIERRE — La oferta y precio ya fueron presentados.\n🛑 INSTRUCCIÓN: Continúa hacia el Paso 4. Si el cliente acepta, confirma interés o pregunta cómo pagar, entrega de inmediato los datos de pago oficiales del producto${activeProductName ? ` "${activeProductName}"` : ''}.`;
    } else if (paso2Done) {
      instruction = `\n⏳ CLIENTE EN ETAPA DE PRESENTACIÓN — El producto ya fue presentado.\n🛑 INSTRUCCIÓN: Continúa hacia el Paso 3. Presenta ahora la oferta con precio promocional, bonos y garantía de "${activeProductName || 'el producto en foco'}". NO vuelvas a repetir la presentación del Paso 2.`;
    } else if (paso1Done) {
      instruction = `\n⏳ CLIENTE CALIFICADO — La pregunta de calificación (Paso 1) ya fue realizada.\n🛑 INSTRUCCIÓN: Continúa hacia el Paso 2. Valida la respuesta del cliente y presenta los beneficios, estructura y enlace de demostración de "${activeProductName || 'el producto en foco'}" según el Paso 2 de su embudo.`;
    } else {
      instruction = `\n🛑 INSTRUCCIÓN: El cliente está llegando por primera vez. Inicia el embudo desde el Paso 1${activeProductName ? ` para "${activeProductName}"` : ''}. Saluda cordialmente y realiza la pregunta de calificación del Paso 1.`;
    }

    stateLines.push(instruction);
    return stateLines.join('\n');
  }
  
  private buildToolInstructions(): string {
    return `
[INSTRUCCIONES DE TOOLS - ETIQUETADO Y CRM AUTOMÁTICO]:
Tienes acceso a herramientas esenciales que puedes usar para registrar datos en el CRM:
- update_business_memory: Úsala para registrar intereses del cliente, etiquetas o su nivel de avance en la compra:
  * interests: Agrega el nombre exacto del producto o servicio consultado (ej: ["REPUESTERA EN CONTROL 2026"], ["Física"]).
  * leadStatus: Clasifica el estado de venta ("COLD", "WARM", "HOT"). 🛑 REGLA INQUEBRANTABLE: NUNCA clasifiques a un lead como "CLOSED" ni uses la etiqueta "PAGO_CONFIRMADO" por promesas futuras de pago ("hoy puedo pagarlo", "mañana transfiero", "voy a pagar"). Si el cliente dice que pagará más tarde, clasifícalo como "HOT" con la etiqueta "ESPERA_DE_PAGO".
  * tags: Etiquetas relevantes (ej: ["INTERESADO_PRODUCTO", "PIDIO_PRECIO", "ESPERA_DE_PAGO", etc.]).
  * name, company, objections: Datos adicionales relevantes.
- create_task: Para tareas o recordatorios internos del equipo comercial.

REGLA OBLIGATORIA: Siempre debes responder de forma amable, profesional y persuasiva al mensaje del usuario en lenguaje natural. Nunca te pauses ni te despidas diciendo que transferirás a un asesor por saludos o preguntas de anuncios ("¿Hay alguien con quien pueda chatear?", "Quiero más información", etc.). Atiende al usuario de inmediato y llévalo a través del proceso de venta por este mismo chat escrito. Nunca dejes al usuario sin respuesta.`;
  }
  
  private buildHistory(history: Interaction[]): any[] {
    const messages: any[] = [];
    for (const msg of history) {
      if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId || 'tool_call_default'
        });
      } else if (msg.role === 'assistant' && msg.toolCalls) {
        const toolCallsArr = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCallsArr.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) }
          }))
        });

        // Especificación estricta de OpenAI / Gemini / OpenRouter:
        // Todo mensaje assistant con tool_calls debe ir seguido de mensajes con role 'tool'.
        // Si en la base de datos no hay un registro de TOOL_RESULT posterior, sintetizamos el resultado.
        const nextMsg = history[history.indexOf(msg) + 1];
        if (!nextMsg || nextMsg.role !== 'tool') {
          for (const tc of (toolCallsArr as any[])) {
            messages.push({
              role: 'tool',
              content: '{"status":"ok"}',
              tool_call_id: tc?.id || 'tool_call_default'
            });
          }
        }
      } else {
        let content = msg.content;
        if (msg.role === 'assistant' || msg.direction === 'OUTBOUND') {
          content = sanitizeUserFacingResponse(content);
          if (!isSafeUserFacingResponse(content)) {
            // Ignorar mensajes históricos contaminados con razonamiento interno para evitar auto-contaminación
            continue;
          }
        }
        messages.push({
          role: msg.role || (msg.direction === 'INBOUND' ? 'user' : 'assistant'),
          content: content
        });
      }
    }
    return messages;
  }
}
