import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBusinessStudioStore } from '@/store/business-studio.store';
import { useBootstrapStore } from '@/store/bootstrap.store';
import SaveIndicator from './SaveIndicator';
import ConflictDialog from './ConflictDialog';
import { Save, XCircle, Sparkles, HelpCircle } from 'lucide-react';

interface KnowledgeEditorProps {
  sectionKey: string;
  initialData: any;
  editable: boolean;
}

const SECTION_GUIDANCE: Record<string, { title: string; placeholder: string; hint: string }> = {
  identidad: {
    title: 'Identidad y Personalidad del Bot',
    placeholder: `Ejemplo:\nEres Sofía, una asesora comercial experta, empática y persuasiva de nuestra academia.\nTu objetivo es atender a los prospectos con calidez, responder sus dudas sobre los cursos y guiarlos hacia el cierre de venta.\nHabla siempre en tono cercano, profesional y entusiasta.`,
    hint: 'Escribe en tus propias palabras el nombre, tono de voz y la actitud que debe tener el bot al vender.',
  },
  empresa: {
    title: 'Información de la Empresa o Negocio',
    placeholder: `Ejemplo:\nSomos Ingenio Digital, una plataforma educativa de cursos y herramientas digitales para profesores y estudiantes.\nUbicación: Caracas, Venezuela y toda Latinoamérica online.\nSitio web: https://ingeniodigital.shop\nMedios de pago aceptados: Pago Móvil (Bs), Transferencia Bancaria, Binance USDT, PayPal.`,
    hint: 'Explica qué hace tu negocio, qué medios de pago aceptas, tu ubicación y propuesta de valor.',
  },
  enrutamiento: {
    title: 'Estrategia de Enrutamiento y Flujo Comercial',
    placeholder: `Ejemplo:
1. Modo de Entrada (Triaje Inicial):
- Saludo general o sin producto definido: Saludar amablemente en nombre de la plataforma y preguntar: "¿De qué materia o año eres docente y buscas material?"
- Entrada directa por anuncio: Si el cliente menciona un producto específico en su primer mensaje (ej: Matemática o Física), ingresar de inmediato a ese embudo sin hacer preguntas redundantes.

2. Reglas de Venta Cruzada y Combos (Cross-Selling):
- Si el cliente pregunta por otra materia (ej: Física) estando en Matemática, presentar el Mega Kit de Física y ofrecer el Combo de ambas por 12.000 Bs.
- Nunca reiniciar el saludo ni repetir "Hola, bienvenido" si la conversación ya está en curso.`,
    hint: 'Configura cómo debe recibir el bot a prospectos nuevos, qué preguntar si no especifican producto y qué combos o reglas de venta cruzada aplicar.',
  },
  scriptsComerciales: {
    title: 'Guiones y Argumentos Comerciales',
    placeholder: `Ejemplo:\n- Cuando el cliente pregunte el precio, menciona el valor de oferta por tiempo limitado y resalta que incluye acceso de por vida.\n- Si el cliente duda, ofrécele una muestra o explícale los beneficios inmediatos que obtendrá.\n- Para concretar la venta, solicita nombre y correo electrónico para facilitarle los datos bancarios.`,
    hint: 'Describe cómo quieres que el bot argumente la venta, maneje el cierre y motive al cliente a comprar.',
  },
  reglasBot: {
    title: 'Control y Reglas de Pausa del Bot',
    placeholder: `Configuración de Auto-Pausa y Límites del Bot:\n- Auto-Pausa por Desinterés (Opt-Out): Activada\n- Auto-Pausa por Solicitud de Humano: Activada\n- Límite de Mensajes del Bot: 10 mensajes`,
    hint: 'Configura las reglas de detención automática del bot para evitar insistir a clientes no interesados y ahorrar consumo de tokens.',
  },
};

interface ReglasBotData {
  autoPauseOptOut: boolean;
  optOutMessage: string;
  autoPauseHandoff: boolean;
  handoffMessage: string;
  autoPausePayment: boolean;
  paymentReceivedMessage: string;
  enableMessageLimit: boolean;
  maxBotMessages: number;
  respondLastMessageBeforePause: boolean;
  autoResetAfterTime: boolean;
  resetHours: number;
  limitReachedMessage: string;
  enableResponseDelay: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  simulateTyping: boolean;
}

const DEFAULT_REGLAS_BOT: ReglasBotData = {
  autoPauseOptOut: true,
  optOutMessage: 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!',
  autoPauseHandoff: true,
  handoffMessage: 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.',
  autoPausePayment: true,
  paymentReceivedMessage: '¡Muchas gracias! 🎉 Hemos recibido tu comprobante de pago. En breve un asesor de nuestro equipo verificará los datos de la transferencia y te entregará el acceso a tu material por este medio. ¡Quedamos a tu completa orden!',
  enableMessageLimit: true,
  maxBotMessages: 10,
  respondLastMessageBeforePause: true,
  autoResetAfterTime: false,
  resetHours: 24,
  limitReachedMessage: '',
  enableResponseDelay: true,
  minDelaySeconds: 4,
  maxDelaySeconds: 10,
  simulateTyping: true,
};

export default function KnowledgeEditor({ sectionKey, initialData, editable }: KnowledgeEditorProps) {
  const queryClient = useQueryClient();
  const { currentVersion, setCurrentVersion } = useBusinessStudioStore();
  const setBootstrapData = useBootstrapStore(s => s.setBootstrapData);
  const bootstrapData = useBootstrapStore(s => s.data);

  // Parse initial bot rules if sectionKey is reglasBot
  const parseReglasBot = (d: any): ReglasBotData => {
    if (!d || typeof d !== 'object') return DEFAULT_REGLAS_BOT;
    return {
      autoPauseOptOut: d.autoPauseOptOut !== undefined ? Boolean(d.autoPauseOptOut) : true,
      optOutMessage: d.optOutMessage || DEFAULT_REGLAS_BOT.optOutMessage,
      autoPauseHandoff: d.autoPauseHandoff !== undefined ? Boolean(d.autoPauseHandoff) : true,
      handoffMessage: d.handoffMessage || DEFAULT_REGLAS_BOT.handoffMessage,
      autoPausePayment: d.autoPausePayment !== undefined ? Boolean(d.autoPausePayment) : true,
      paymentReceivedMessage: d.paymentReceivedMessage || DEFAULT_REGLAS_BOT.paymentReceivedMessage,
      enableMessageLimit: d.enableMessageLimit !== undefined ? Boolean(d.enableMessageLimit) : true,
      maxBotMessages: Number(d.maxBotMessages) || 10,
      respondLastMessageBeforePause: d.respondLastMessageBeforePause !== undefined ? Boolean(d.respondLastMessageBeforePause) : true,
      autoResetAfterTime: d.autoResetAfterTime !== undefined ? Boolean(d.autoResetAfterTime) : false,
      resetHours: Number(d.resetHours) || 24,
      limitReachedMessage: d.limitReachedMessage || '',
      enableResponseDelay: d.enableResponseDelay !== undefined ? Boolean(d.enableResponseDelay) : true,
      minDelaySeconds: Math.max(1, Number(d.minDelaySeconds) || 4),
      maxDelaySeconds: Math.max(1, Number(d.maxDelaySeconds) || 10),
      simulateTyping: d.simulateTyping !== undefined ? Boolean(d.simulateTyping) : true,
    };
  };

  const [reglasData, setReglasData] = useState<ReglasBotData>(parseReglasBot(initialData));

  // Normalizar datos iniciales para mostrarlos en texto natural y limpio (sin llaves de JSON vacías)
  const extractNaturalText = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (typeof d === 'object') {
      if (d.prompt) return d.prompt;
      if (Object.keys(d).length === 0) return '';
      const lines: string[] = [];
      for (const [k, v] of Object.entries(d)) {
        if (v && typeof v === 'string') {
          lines.push(`${k}: ${v}`);
        }
      }
      if (lines.length > 0) return lines.join('\n');
      return JSON.stringify(d, null, 2);
    }
    return String(d);
  };

  const [text, setText] = useState(extractNaturalText(initialData));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showConflict, setShowConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setText(extractNaturalText(initialData));
    setReglasData(parseReglasBot(initialData));
    setIsDirty(false);
    setSaveStatus('idle');
  }, [initialData, sectionKey]);

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await api.put(`/business-studio/bundle/${sectionKey}`, newData, {
        headers: { 'x-knowledge-version': currentVersion }
      });
      return res.data;
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: (updatedData) => {
      setSaveStatus('saved');
      setIsDirty(false);
      const newVersion = (currentVersion || 0) + 1;
      setCurrentVersion(newVersion);
      setBootstrapData({ ...bootstrapData, version: newVersion });
      queryClient.setQueryData(['business-studio-knowledge-base', sectionKey], updatedData);
      queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
      queryClient.invalidateQueries({ queryKey: ['business-studio-knowledge-base'] });
      setTimeout(() => {
        if (saveStatus !== 'saving') setSaveStatus('idle');
      }, 2000);
    },
    onError: (error: any) => {
      setSaveStatus('error');
      if (error.response?.status === 409) {
        setShowConflict(true);
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editable) return;
    setText(e.target.value);
    setIsDirty(true);
    if (saveStatus === 'saved' || saveStatus === 'error') {
      setSaveStatus('idle');
    }
  };

  const handleSave = () => {
    if (sectionKey === 'reglasBot') {
      mutation.mutate(reglasData);
      return;
    }

    const trimmed = text.trim();
    try {
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        const parsed = JSON.parse(trimmed);
        mutation.mutate(parsed);
        return;
      }
    } catch {}
    mutation.mutate(trimmed);
  };

  const handleCancel = () => {
    setText(extractNaturalText(initialData));
    setReglasData(parseReglasBot(initialData));
    setIsDirty(false);
    setSaveStatus('idle');
  };

  const handleReload = () => {
    setShowConflict(false);
    queryClient.invalidateQueries({ queryKey: ['business-studio-knowledge-base', sectionKey] });
  };

  const guidance = SECTION_GUIDANCE[sectionKey] || {
    title: `Configuración de ${sectionKey}`,
    placeholder: 'Escribe aquí la información o instrucciones en lenguaje natural...',
    hint: 'Puedes escribir párrafos, listas o guiones comerciales libremente. La IA interpretará tus instrucciones de forma natural.',
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
      {/* Header con indicador de guardado y botones */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{guidance.title}</span>
          <SaveIndicator status={saveStatus} isDirty={isDirty} />
        </div>
        {editable && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleCancel}
              disabled={!isDirty || mutation.isPending}
              className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || mutation.isPending}
              className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Banner de ayuda en lenguaje natural */}
      <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-800">
        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
        <span>{guidance.hint}</span>
      </div>

      {/* Si es sección de Reglas del Bot, renderizamos el panel interactivo visual */}
      {sectionKey === 'reglasBot' ? (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          
          {/* Card 1: Opt-Out */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🛑 Auto-Pausa por Desinterés (Opt-Out)
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detiene el bot permanentemente y cancela los seguimientos cuando el cliente dice "no me interesa", "no gracias", "no me escriban más", etc.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglasData.autoPauseOptOut}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, autoPauseOptOut: e.target.checked });
                    setIsDirty(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {reglasData.autoPauseOptOut && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mensaje de despedida enviado al cliente:
                </label>
                <textarea
                  rows={2}
                  value={reglasData.optOutMessage}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, optOutMessage: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Card 2: Human Handoff */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  👤 Auto-Pausa y Traspaso a Asesor Humano (Handoff)
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pausa el bot y cancela seguimientos cuando el cliente solicita hablar con un humano, asesor o persona real.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglasData.autoPauseHandoff}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, autoPauseHandoff: e.target.checked });
                    setIsDirty(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {reglasData.autoPauseHandoff && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mensaje de confirmación de transferencia:
                </label>
                <textarea
                  rows={2}
                  value={reglasData.handoffMessage}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, handoffMessage: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Card 3: Payment Receipt Auto-Pause */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  💰 Auto-Pausa por Recepción de Comprobante de Pago
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pausa el bot de inmediato y cancela seguimientos cuando el cliente envía su comprobante de pago o capture de transferencia, alertando al asesor para verificar y entregar el material.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglasData.autoPausePayment}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, autoPausePayment: e.target.checked });
                    setIsDirty(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {reglasData.autoPausePayment && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mensaje de confirmación enviado al cliente al recibir el pago:
                </label>
                <textarea
                  rows={3}
                  value={reglasData.paymentReceivedMessage}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, paymentReceivedMessage: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Card 4: Message Limit & Auto-Reset (Token Saver & Flow Preserver) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  ⏱️ Límite Máximo de Respuestas del Bot (Ahorro de Tokens)
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Responde normalmente el último mensaje y luego se pausa en silencio sin cortar el hilo de la conversación.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglasData.enableMessageLimit}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, enableMessageLimit: e.target.checked });
                    setIsDirty(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {reglasData.enableMessageLimit && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-800">
                      Límite de respuestas automáticas por chat:
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Al llegar a este número, el bot responde su último mensaje y se detiene silenciosamente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={reglasData.maxBotMessages}
                      onChange={(e) => {
                        setReglasData({ ...reglasData, maxBotMessages: Number(e.target.value) || 10 });
                        setIsDirty(true);
                      }}
                      className="w-20 p-2 text-sm bg-white border border-gray-200 rounded-lg text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-xs text-gray-500 font-medium">mensajes</span>
                  </div>
                </div>

                {/* Sub-option: Auto-Reset after time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div>
                    <span className="block text-xs font-bold text-blue-900">
                      🔄 Reactivación Automática tras un periodo de inactividad
                    </span>
                    <p className="text-[11px] text-blue-700/80 mt-0.5">
                      Si el cliente vuelve a escribir después de este tiempo, el bot se reactivará solo.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {reglasData.autoResetAfterTime && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={168}
                          value={reglasData.resetHours}
                          onChange={(e) => {
                            setReglasData({ ...reglasData, resetHours: Number(e.target.value) || 24 });
                            setIsDirty(true);
                          }}
                          className="w-16 p-1.5 text-xs bg-white border border-blue-200 rounded-lg text-center font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs text-blue-800 font-medium">horas</span>
                      </div>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reglasData.autoResetAfterTime}
                        onChange={(e) => {
                          setReglasData({ ...reglasData, autoResetAfterTime: e.target.checked });
                          setIsDirty(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    (Opcional) Mensaje final de despedida al alcanzar el límite:
                  </label>
                  <input
                    type="text"
                    placeholder="Dejar en blanco para una pausa silenciosa natural (Recomendado)"
                    value={reglasData.limitReachedMessage}
                    onChange={(e) => {
                      setReglasData({ ...reglasData, limitReachedMessage: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Tiempo de Respuesta & Simulación Humana ("Escribiendo...") */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  ⏳ Tiempo de Respuesta y Simulación Humana ("Escribiendo...")
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Evita que el bot responda de forma instantánea o robótica, agregando un intervalo de espera natural y mostrando el estado "Escribiendo..." en WhatsApp.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglasData.enableResponseDelay}
                  onChange={(e) => {
                    setReglasData({ ...reglasData, enableResponseDelay: e.target.checked });
                    setIsDirty(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {reglasData.enableResponseDelay && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Tiempo Mínimo de Espera:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={reglasData.minDelaySeconds}
                        onChange={(e) => {
                          setReglasData({ ...reglasData, minDelaySeconds: Number(e.target.value) || 1 });
                          setIsDirty(true);
                        }}
                        className="w-20 p-2 text-sm bg-white border border-gray-200 rounded-lg text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-xs text-gray-600 font-medium">segundos</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Tiempo Máximo de Espera:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={reglasData.maxDelaySeconds}
                        onChange={(e) => {
                          setReglasData({ ...reglasData, maxDelaySeconds: Number(e.target.value) || 1 });
                          setIsDirty(true);
                        }}
                        className="w-20 p-2 text-sm bg-white border border-gray-200 rounded-lg text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-xs text-gray-600 font-medium">segundos</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div>
                    <span className="block text-xs font-bold text-emerald-900">
                      💬 Mostrar estado "Escribiendo..." en WhatsApp
                    </span>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">
                      Activa la animación de escritura en la app del cliente mientras transcurre el tiempo de espera.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={reglasData.simulateTyping}
                      onChange={(e) => {
                        setReglasData({ ...reglasData, simulateTyping: e.target.checked });
                        setIsDirty(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Área de texto en lenguaje natural */
        <textarea
          value={text}
          onChange={handleChange}
          placeholder={guidance.placeholder}
          readOnly={!editable}
          className={`w-full flex-1 p-4 font-sans text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 inset-0 ${
            !editable ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
          spellCheck="false"
        />
      )}
      
      <ConflictDialog isOpen={showConflict} onReload={handleReload} onClose={() => setShowConflict(false)} />
    </div>
  );
}
