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
});
