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
});
