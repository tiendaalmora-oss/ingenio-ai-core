import { sanitizeUserFacingResponse } from './response-sanitizer';

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
});
