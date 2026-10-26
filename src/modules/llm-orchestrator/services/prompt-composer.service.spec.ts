import { Test, TestingModule } from '@nestjs/testing';
import { PromptComposerService } from './prompt-composer.service';

describe('PromptComposerService — Recompra y Blindaje de Clientes Pagados', () => {
  let service: PromptComposerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptComposerService],
    }).compile();

    service = module.get<PromptComposerService>(PromptComposerService);
  });

  const mockKosBundle = {
    identity: 'Asistente de ventas',
    business: 'RecurseaPro',
    products: {
      items: [
        { nombre: 'Física', embudoVenta: 'Paso 1... Paso 2... Paso 3...' },
        { nombre: 'Química', embudoVenta: 'Paso 1... Paso 2... Paso 3...' },
      ],
    },
  };

  it('1. Cliente nuevo por primera vez inicia en Paso 1 (Calificación)', () => {
    const result = service.compose({
      kosBundle: mockKosBundle,
      memory: null,
      history: [],
      currentMessage: 'Hola, quiero información',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('El cliente está llegando por primera vez');
  });

  it('2. Cliente pagado que consulta soporte se asiste como VIP sin cobrarle de nuevo', () => {
    const memory: any = {
      leadStatus: 'CLOSED',
      tags: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'],
      interests: ['Física'],
    };
    const history: any = [
      { direction: 'INBOUND', role: 'user', content: 'Buenas tardes, no me abre el Drive de Física' },
    ];

    const result = service.compose({
      kosBundle: mockKosBundle,
      memory,
      history,
      currentMessage: 'no me abre el Drive',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('CLIENTE CONFIRMADO COMO PAGADOR');
    expect(sysMsg).toContain('Trátalo como VIP');
  });

  it('3. Cliente pagado que consulta por OTRA materia se activa en RECOMPRA / VENTA CRUZADA sin bloquear datos de pago', () => {
    const memory: any = {
      leadStatus: 'CLOSED',
      tags: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'],
      interests: ['Física'],
    };
    const history: any = [
      { direction: 'INBOUND', role: 'user', content: '📸 [Comprobante de Pago Detectado]: ref 123' },
      { direction: 'OUTBOUND', role: 'assistant', content: '¡Excelente, profe! Ya registramos tu comprobante de Física' },
      { direction: 'INBOUND', role: 'user', content: '¡Hola! Quiero más información sobre el Kit de Quimica' },
    ];

    const result = service.compose({
      kosBundle: mockKosBundle,
      memory,
      history,
      currentMessage: '¡Hola! Quiero más información sobre el Kit de Quimica',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('RECOMPRA DE NUEVA MATERIA O CONSULTA COMERCIAL');
    expect(sysMsg).toContain('NO reenvíes felicitaciones ni confirmaciones de pagos antiguos del historial');
    expect(sysMsg).toContain('ENTREGA DE INMEDIATO los datos de pago oficiales para su nueva compra');
  });

  it('4. Cliente pagado que dice "Quiero 1" para nueva materia tiene permiso para recibir datos de pago', () => {
    const memory: any = {
      leadStatus: 'CLOSED',
      tags: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'],
      interests: ['Física', 'Química'],
    };
    const history: any = [
      { direction: 'INBOUND', role: 'user', content: '📸 [Comprobante de Pago Detectado]: ref 123' },
      { direction: 'OUTBOUND', role: 'assistant', content: '¡Excelente, profe! Ya registramos tu comprobante de Física' },
      { direction: 'INBOUND', role: 'user', content: '¡Hola! Quiero más información sobre el Kit de Quimica' },
      { direction: 'OUTBOUND', role: 'assistant', content: '🧪🔥 MEGA KIT DOCENTE DE QUÍMICA... Precio: 7.250 Bs' },
      { direction: 'INBOUND', role: 'user', content: 'Quiero 1' },
    ];

    const result = service.compose({
      kosBundle: mockKosBundle,
      memory,
      history,
      currentMessage: 'Quiero 1',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('RECOMPRA — EN ETAPA DE CIERRE');
    expect(sysMsg).toContain('ENTREGA DE INMEDIATO los datos oficiales de Pago Móvil / Binance');
  });

  it('5. El sistema contiene la regla estricta de comprobantes históricos para evitar ecos viejos', () => {
    const result = service.compose({
      kosBundle: mockKosBundle,
      memory: null,
      history: [],
      currentMessage: 'Hola',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('REGLA ESTRICTA DE COMPROBANTES HISTÓRICOS');
    expect(sysMsg).toContain('NUNCA envíes felicitaciones ni confirmaciones de pago');
  });

  it('6. Contiene la instrucción explícita que autoriza enlaces de regalo y páginas web configuradas en el embudo', () => {
    const input: PromptComposerInput = {
      kosBundle: {
        identity: 'Bot de Ventas',
        business: 'Ingenio Digital',
        productos: [{ nombre: 'Kit Bíblico', embudoVenta: 'Regalo: https://drive.google.com/...' }]
      },
      memory: null,
      history: []
    };

    const messages = service.compose(input);
    const sysMsg = messages[0].content;

    expect(sysMsg).toContain('ENLACES AUTORIZADOS DEL EMBUDO (REGALOS Y PÁGINAS WEB)');
    expect(sysMsg).toContain('DEBES incluir exactamente el enlace correspondiente tal como está indicado en el guion del embudo');
  });

  it('7. Cliente con leadStatus CLIENT o SALE se reconoce como pagador y prohíbe pedir comprobantes', () => {
    const memory: any = {
      leadStatus: 'CLIENT',
      tags: ['INTERESADO_QUIMICA', 'PAGO_CONFIRMADO'],
      interests: ['Química'],
    };
    const history: any = [
      { direction: 'INBOUND', role: 'user', content: 'Ok en cuenta' },
    ];

    const result = service.compose({
      kosBundle: mockKosBundle,
      memory,
      history,
      currentMessage: 'Ok en cuenta',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('CLIENTE CONFIRMADO COMO PAGADOR / COMPRADOR VERIFICADO');
    expect(sysMsg).toContain('NUNCA le pidas comprobantes de pago');
    expect(sysMsg).toContain('ESTÁ ESTRICTAMENTE PROHIBIDO aplicar la "Situación A"');
  });

  it('8. Dynamic Product Router detecta productos de cualquier subcuenta (ej: REPUESTERA EN CONTROL 2026) y los pone en foco', () => {
    const subaccountBundle = {
      identity: 'Asesor Comercial Ingenio Digital',
      business: 'Ingenio Digital',
      productos: [
        { nombre: 'REPUESTERA EN CONTROL 2026', embudoVenta: 'Paso 1 Repuestera... Paso 2 Inventario...' },
        { nombre: 'SISTEMA GYM PRO 2026', embudoVenta: 'Paso 1 Gym... Paso 2 Membresías...' },
      ],
    };

    const result = service.compose({
      kosBundle: subaccountBundle,
      memory: null,
      history: [],
      currentMessage: 'Hola quiero más info de REPUESTERA EN CONTROL 2026',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('[PRODUCTO ACTIVO EN FOCO EN ESTA CONVERSACIÓN]: "REPUESTERA EN CONTROL 2026"');
    expect(sysMsg).toContain('⭐ [PRODUCTO ACTIVO DEL CLIENTE]: REPUESTERA EN CONTROL 2026');
  });

  it('9. Evita falsos positivos de Paso 4 cuando la presentación menciona "cuentas por cobrar" o "ten en cuenta"', () => {
    const result = service.compose({
      kosBundle: mockKosBundle,
      memory: { leadStatus: 'WARM', interests: ['Física'], tags: ['INTERESADO'] } as any,
      history: [
        { direction: 'INBOUND', role: 'user', content: 'Hola quiero info' } as any,
        {
          direction: 'OUTBOUND',
          role: 'assistant',
          content: '¡Hola! Ten en cuenta que nuestro sistema incluye control total de cuentas por cobrar, inventario y facturación en todo lo que recibes.',
        } as any,
      ],
      currentMessage: 'Me interesa, qué precio tiene?',
    });

    const sysMsg = result.find((m) => m.role === 'system')?.content;
    expect(sysMsg).toContain('Estado Paso 4: PENDIENTE (Datos de pago)');
    expect(sysMsg).not.toContain('CLIENTE EN ESPERA DE PAGO — Los datos de pago ya fueron entregados');
  });

  it('10. No duplica el mensaje del usuario en la segunda pasada después de ejecutar una herramienta (TOOL_RESULT)', () => {
    const result = service.compose({
      kosBundle: mockKosBundle,
      memory: null,
      history: [
        { direction: 'INBOUND', role: 'user', type: 'TEXT', content: 'Hola quiero info de Física' } as any,
        {
          direction: 'OUTBOUND',
          role: 'assistant',
          type: 'TOOL_CALL',
          content: '',
          toolCalls: [{ id: 'tc_1', name: 'update_business_memory', arguments: { interests: ['Física'] } }],
        } as any,
        { direction: 'INBOUND', role: 'tool', type: 'TOOL_RESULT', content: '{"status":"ok"}', toolCallId: 'tc_1' } as any,
      ],
      currentMessage: 'Hola quiero info de Física',
    });

    const userMsgs = result.filter((m) => m.role === 'user' && m.content === 'Hola quiero info de Física');
    expect(userMsgs.length).toBe(1);
  });
});

