import { sanitizeUserFacingResponse, isSafeUserFacingResponse } from './response-sanitizer';

describe('sanitizeUserFacingResponse', () => {
  it('should extract final response when model outputs scratchpad tags', () => {
    const raw = `1.
[SYSTEM]
El usuario ha expresado su deseo de adquirir el kit.
[STATE]
Response: "Excelente! Para continuar, por favor, indícame tu nombre completo y correo electrónico para enviarte los datos de la transferencia y el acceso al kit."
[TOOL CALLS]
update_business_memory(leadStatus="HOT", interests=["Mega Kit Matemática Secundaria Venezuela"])
[FINAL RESPONSE]
Excelente! Para continuar, por favor, indícame tu nombre completo y correo electrónico para enviarte los datos de la transferencia y el acceso al kit.`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).toBe('Excelente! Para continuar, por favor, indícame tu nombre completo y correo electrónico para enviarte los datos de la transferencia y el acceso al kit.');
  });

  it('should return clean text unmodified if no tags present', () => {
    const raw = 'Hola, el precio es de 7.250 Bs con acceso de por vida.';
    expect(sanitizeUserFacingResponse(raw)).toBe('Hola, el precio es de 7.250 Bs con acceso de por vida.');
  });

  it('should remove thought blocks', () => {
    const raw = '<thought>Pensando en la respuesta...</thought>Hola! ¿En qué puedo ayudarte?';
    expect(sanitizeUserFacingResponse(raw)).toBe('Hola! ¿En qué puedo ayudarte?');
  });

  it('should clean English planner monologue and unescaped newlines from model output', () => {
    const raw = `Initialize a new conversation with the user. The user has expressed interest in the "Kit de Química". According to the provided knowledge base, the sales funnel for the "Kit Docente de Química" starts with a qualification step. The first message in this funnel is: "¡Hola, profe! Qué gusto saludarte. 👋🧪🇻🇪\\n\\nAntes de darte los detalles, cuéntame una cosita:\\n¿Qué años de bachillerato estás atendiendo actualmente (3°, 4°, 5° o 1°/2°)? 📚\\n\\n(Así te oriento exactamente con el material que necesitas) 👇" I should also update the business memory to reflect the user's interest in the "Kit de Química" and set the lead status to "WARM".`;
    
    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).not.toContain('Initialize a new conversation');
    expect(cleaned).not.toContain('I should also update the business memory');
    expect(cleaned).toContain('¡Hola, profe! Qué gusto saludarte. 👋🧪🇻🇪');
    expect(cleaned).toContain('¿Qué años de bachillerato estás atendiendo actualmente');
    expect(cleaned).not.toContain('\\n');
  });

  it('should strip hallucinated image and attachment placeholders', () => {
    const raw = `¡Claro que sí, profe! Con mucho gusto te muestro. 🙌\n\nMira, cada evaluación viene diseñada para que solo tengas que aplicarla:\n\n[IMAGEN DE UNA EVALUACIÓN DE MATEMÁTICA EN WORD CON ESPACIO PARA NOMBRE Y ESCALA DE 20 PUNTOS]\n\n¿Te parece práctico para tu día a día? 😊`;
    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).not.toContain('[IMAGEN DE UNA EVALUACIÓN');
    expect(cleaned).toContain('¡Claro que sí, profe!');
    expect(cleaned).toContain('¿Te parece práctico para tu día a día? 😊');
  });

  it('should strip various attachment placeholders like [FOTO DE...], [CAPTURE...], [ARCHIVO...]', () => {
    const raw = 'Aquí tienes el detalle:\n[FOTO DE LA PLANIFICACIÓN ANUAL]\n[CAPTURE DEL DRIVE]\n[ARCHIVO ADJUNTO]\n¿Qué te parece?';
    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).not.toContain('[FOTO');
    expect(cleaned).not.toContain('[CAPTURE');
    expect(cleaned).not.toContain('[ARCHIVO');
    expect(cleaned).toContain('Aquí tienes el detalle:');
    expect(cleaned).toContain('¿Qué te parece?');
  });

  it('should strip leaked funnel state tracking lines from LLM output', () => {
    const raw = `✅ Paso 1 COMPLETADO — Calificación inicial ya realizada.
⏳ Paso 2 PENDIENTE — Presentación del producto.
⏳ Paso 3 PENDIENTE — Oferta y precio.
⏳ Paso 4 PENDIENTE — Datos de pago.

¡Excelente, profe! Justo para tu nivel tenemos todo preparado. 👏🇻🇪`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).not.toContain('Paso 1 COMPLETADO');
    expect(cleaned).not.toContain('Paso 2 PENDIENTE');
    expect(cleaned).not.toContain('Paso 3 PENDIENTE');
    expect(cleaned).not.toContain('Paso 4 PENDIENTE');
    expect(cleaned).toContain('¡Excelente, profe! Justo para tu nivel tenemos todo preparado. 👏🇻🇪');
  });

  it('should preserve legitimate marketing content that mentions "Paso a Paso" and checkmarks', () => {
    const raw = `🧪🔥 MEGA KIT DOCENTE DE QUÍMICA · VENEZUELA 🇻🇪🔥🧪

📁 TODO LO QUE RECIBES EN WORD (.docx) 100% EDITABLE:
✅ Evaluaciones de 3°, 4° y 5° Año (+ Módulo Extra 1° y 2°) 📝
✅ Versión Profesor Resuelta Paso a Paso (Escala oficial 20 Puntos) ⏱️
✅ Planificaciones MPPE de los 3 Momentos Pedagógicos 📋`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).toContain('Versión Profesor Resuelta Paso a Paso');
    expect(cleaned).toContain('✅ Evaluaciones de 3°, 4° y 5° Año');
    expect(cleaned).toContain('✅ Planificaciones MPPE');
  });

  it('should completely strip English reasoning monologue with clipped start and glued Spanish greeting (Freddy Veliz case)', () => {
    const raw = `s asking for information about the "Kit de Matemática".
This request falls under the "PRODUCTO #1: MEGA KIT DOCENTE DE MATEMÁTICA - BACHILLERATO VENEZUELA" in the KOS.
The current state of the funnel for this product is "Estado Paso 1: PENDIENTE (Calificación inicial)".
Therefore, I need to start the sales funnel from Step 1, which involves greeting the user and asking a qualifying question.
The script for Step 1 of the "MEGA KIT DOCENTE DE MATEMÁTICA" funnel is:
"¡Hola, profe! Qué bueno saludarte. 👋📐🇻🇪

Cuéntame una sola cosita para saber exactamente qué enviarte:
¿Das clases en liceo público o en colegio privado, y qué años tienes a tu cargo? 🏫📚

(Así te oriento con el material adaptado a tu institución) 👇"

I will use this script to respond to the user.
I also need to update the business memory. The user is interested in 'Kit de Matemática', so I should add "Matemática" to the \`interests\` and set \`leadStatus\` to 'WARM' as they are actively inquiring. I should also set the \`tags\` to "INTERESADO_PRODUCTO".¡Hola, profe! Qué bueno saludarte. 👋📐🇻🇪

Cuéntame una sola cosita para saber exactamente qué enviarte:
¿Das clases en liceo público o en colegio privado, y qué años tienes a tu cargo? 🏫📚

(Así te oriento con el material adaptado a tu institución) 👇`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).not.toContain('s asking for information');
    expect(cleaned).not.toContain('This request falls under');
    expect(cleaned).not.toContain('The current state of the funnel');
    expect(cleaned).not.toContain('Therefore, I need to start');
    expect(cleaned).not.toContain('The script for Step 1');
    expect(cleaned).not.toContain('I will use this script');
    expect(cleaned).not.toContain('I also need to update');
    expect(cleaned).not.toContain('INTERESADO_PRODUCTO');
    expect(cleaned).toContain('¡Hola, profe! Qué bueno saludarte. 👋📐🇻🇪');
    expect(cleaned).toContain('¿Das clases en liceo público o en colegio privado');
  });

  it('should clean Python tool call leaks (Cesar case)', () => {
    const raw = `tool_code
print(default_api.update_business_memory(interests=['Física'], leadStatus='WARM', tags=['INTERESADO_PRODUCTO']))`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).toBe('');
  });

  it('should completely suppress Apure English CoT reasoning leak with KOS and tool parameters', () => {
    const raw = `. According to the KOS, the first step for this product is 'Paso 1 — Calificación y Micro-Filtro'... The update_business_memory tool can be used for this... interests: ['Mega Pack Musculación & Fitness Pro 2026']...`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).toBe('');
    expect(isSafeUserFacingResponse(raw)).toBe(false);
    expect(isSafeUserFacingResponse(cleaned)).toBe(false);
  });

  it('should cleanly extract Spanish dialogue when preceded by English KOS monologue', () => {
    const raw = `According to the KOS, the first step for this product is 'Paso 1'. The script for Step 1 is: "¡Hola! Qué gusto saludarte. 💪🏋️‍♂️ ¿Entrenas en casa o en gimnasio?" I will call update_business_memory.`;

    const cleaned = sanitizeUserFacingResponse(raw);
    expect(cleaned).toContain('¡Hola! Qué gusto saludarte.');
    expect(cleaned).toContain('¿Entrenas en casa o en gimnasio?');
    expect(cleaned).not.toContain('According to the KOS');
    expect(cleaned).not.toContain('update_business_memory');
    expect(isSafeUserFacingResponse(cleaned)).toBe(true);
  });
});

describe('isSafeUserFacingResponse', () => {
  it('should accept clean Spanish messages', () => {
    expect(isSafeUserFacingResponse('¡Hola! Bienvenido, ¿en qué podemos ayudarte hoy?')).toBe(true);
    expect(isSafeUserFacingResponse('El precio promocional es de 10$ o al cambio en Bs.')).toBe(true);
    expect(isSafeUserFacingResponse('✅ Evaluaciones de 3°, 4° y 5° Año\n✅ Versión Profesor Resuelta Paso a Paso')).toBe(true);
  });

  it('should reject messages containing internal tool names or code', () => {
    expect(isSafeUserFacingResponse('Voy a llamar a update_business_memory para guardar tus datos.')).toBe(false);
    expect(isSafeUserFacingResponse('tool_code print(default_api.test())')).toBe(false);
    expect(isSafeUserFacingResponse('call:create_task{"title":"test"}')).toBe(false);
  });

  it('should reject messages containing prompt or architecture metadata', () => {
    expect(isSafeUserFacingResponse('According to the KOS, this is step 1.')).toBe(false);
    expect(isSafeUserFacingResponse('[ESTADO DEL EMBUDO] Paso 1 COMPLETADO')).toBe(false);
    expect(isSafeUserFacingResponse('Paso 2 PENDIENTE')).toBe(false);
    expect(isSafeUserFacingResponse('leadStatus="WARM"')).toBe(false);
  });

  it('should reject dominant English planning sentences', () => {
    expect(isSafeUserFacingResponse('The user is asking for information about this product.')).toBe(false);
    expect(isSafeUserFacingResponse('Therefore, I need to start the funnel from step 1.')).toBe(false);
    expect(isSafeUserFacingResponse('I will use this script to respond to the user.')).toBe(false);
  });

  it('should reject empty or whitespace-only messages', () => {
    expect(isSafeUserFacingResponse('')).toBe(false);
    expect(isSafeUserFacingResponse('   ')).toBe(false);
    expect(isSafeUserFacingResponse('.')).toBe(false);
  });
});
