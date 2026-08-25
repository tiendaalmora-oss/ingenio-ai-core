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
  scriptsComerciales: {
    title: 'Guiones y Argumentos Comerciales',
    placeholder: `Ejemplo:\n- Cuando el cliente pregunte el precio, menciona el valor de oferta por tiempo limitado y resalta que incluye acceso de por vida.\n- Si el cliente duda, ofrécele una muestra o explícale los beneficios inmediatos que obtendrá.\n- Para concretar la venta, solicita nombre y correo electrónico para facilitarle los datos bancarios.`,
    hint: 'Describe cómo quieres que el bot argumente la venta, maneje el cierre y motive al cliente a comprar.',
  },
  politicasAtencion: {
    title: 'Políticas de Atención y Garantías',
    placeholder: `Ejemplo:\n- Horario de atención humana: Lunes a Sábado de 8:00 AM a 8:00 PM.\n- Entrega de productos digitales: Envío inmediato por enlace de Google Drive o correo tras confirmar el pago.\n- Garantía de satisfacción de 7 días.`,
    hint: 'Detalla los tiempos de entrega, políticas de devolución, horarios de soporte y garantías.',
  },
};

export default function KnowledgeEditor({ sectionKey, initialData, editable }: KnowledgeEditorProps) {
  const queryClient = useQueryClient();
  const { currentVersion, setCurrentVersion } = useBusinessStudioStore();
  const setBootstrapData = useBootstrapStore(s => s.setBootstrapData);
  const bootstrapData = useBootstrapStore(s => s.data);

  // Normalizar datos iniciales para mostrarlos en texto natural y limpio (sin llaves de JSON vacías)
  const extractNaturalText = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (typeof d === 'object') {
      if (d.prompt) return d.prompt;
      // Si es un objeto vacío {}, no mostrar '{}' al usuario
      if (Object.keys(d).length === 0) return '';
      // Si es un objeto con campos clásicos de identidad/empresa, transformarlo a texto legible
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
    // Si el usuario ingresó texto natural, se guarda como string limpio o como objeto con prompt
    const trimmed = text.trim();
    try {
      // Si el usuario expresamente escribió un JSON válido, lo parseamos
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        const parsed = JSON.parse(trimmed);
        mutation.mutate(parsed);
        return;
      }
    } catch {
      // Si no es JSON, guardamos como texto natural directamente
    }
    mutation.mutate(trimmed);
  };

  const handleCancel = () => {
    setText(extractNaturalText(initialData));
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{guidance.title}</span>
          <SaveIndicator status={saveStatus} isDirty={isDirty} />
        </div>
        {editable && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={!isDirty || mutation.isPending}
              className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || mutation.isPending}
              className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Área de texto en lenguaje natural */}
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
      
      <ConflictDialog isOpen={showConflict} onReload={handleReload} onClose={() => setShowConflict(false)} />
    </div>
  );
}
