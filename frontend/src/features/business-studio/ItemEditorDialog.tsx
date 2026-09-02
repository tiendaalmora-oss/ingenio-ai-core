import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Code2, FormInput } from 'lucide-react';

interface ItemEditorDialogProps {
  isOpen: boolean;
  sectionKey?: string;
  item: any | null;
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}

interface FormFieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea';
  required?: boolean;
}

const SECTION_FORM_CONFIGS: Record<string, { title: string; subtitle: string; fields: FormFieldDef[] }> = {
  productos: {
    title: 'Producto u Oferta Comercial',
    subtitle: 'Define el producto, su embudo de venta paso a paso y su base de conocimiento técnica.',
    fields: [
      { 
        key: 'nombre', 
        label: '1. Nombre del Producto u Oferta', 
        placeholder: 'Ej: Mega Kit Docente de Matemática Secundaria', 
        type: 'text', 
        required: true 
      },
      { 
        key: 'embudoVenta', 
        label: '2. Embudo de Venta y Secuencia Paso a Paso (Guion de Cierre, Oferta y Precios)', 
        placeholder: 'Escribe aquí el guion comercial y los pasos estructurados con sus emojis, textos y espaciados:\n\n*Paso 1 (Calificación / Regalo inicial):*\n¡Hola profe! ¿Para qué año o sección estás buscando material pedagógico?\n\n*Paso 2 (Presentación y Beneficios del Kit):*\nEl kit incluye más de 80 evaluaciones resueltas y planificaciones editables en Word...\n\n*Paso 3 (Oferta, Precio Promocional y Regalos):*\nPrecio de oferta: 7.250 Bs + 7 Regalos exclusivos incluidos hoy...\n\n*Paso 4 (Cierre y Métodos de Pago):*\nDisponemos de Pago Móvil y Transferencia Bancaria...', 
        type: 'textarea', 
        required: true 
      },
      { 
        key: 'baseConocimiento', 
        label: '3. 📚 Base de Conocimiento y Ficha Técnica Especializada (Solo bajo demanda)', 
        placeholder: 'Escribe aquí los detalles técnicos específicos de este producto:\n- Formato de archivos (.docx/.pdf 100% editables)\n- Temario curricular detallado por nivel o año\n- Requisitos y contenidos específicos\n(El bot SOLO consultará esta información si el cliente hace una pregunta técnica puntual).', 
        type: 'textarea' 
      },
    ],
  },
  categorias: {
    title: 'Categoría de Productos',
    subtitle: 'Agrupa tus productos para que el bot pueda recomendarlos fácilmente.',
    fields: [
      { key: 'nombre', label: 'Nombre de la Categoría', placeholder: 'Ej: Cursos Online, Kits Digitales, Asesorías', type: 'text', required: true },
      { key: 'descripcion', label: 'Descripción de la Categoría', placeholder: 'Ej: Materiales pedagógicos descargables para docentes y estudiantes.', type: 'textarea' },
    ],
  },
  servicios: {
    title: 'Servicio',
    subtitle: 'Registra los servicios adicionales que ofrece tu negocio.',
    fields: [
      { key: 'nombre', label: 'Nombre del Servicio', placeholder: 'Ej: Asesoría Personalizada 1 a 1', type: 'text', required: true },
      { key: 'precio', label: 'Tarifa / Precio', placeholder: 'Ej: $30 USD por hora', type: 'text' },
      { key: 'descripcion', label: 'Descripción del Servicio', placeholder: 'Ej: Sesión virtual en vivo para resolver dudas específicas y diseñar plan de trabajo.', type: 'textarea', required: true },
    ],
  },
  faqs: {
    title: 'Pregunta Frecuente (FAQ)',
    subtitle: 'Respuestas automáticas a las dudas habituales de los clientes.',
    fields: [
      { key: 'pregunta', label: 'Pregunta del Cliente', placeholder: 'Ej: ¿Cómo y cuándo me entregan el material?', type: 'text', required: true },
      { key: 'respuesta', label: 'Respuesta que debe dar el Bot', placeholder: 'Ej: El acceso se envía de inmediato a tu correo o WhatsApp con enlace a Google Drive una vez confirmado el pago.', type: 'textarea', required: true },
    ],
  },
  objeciones: {
    title: 'Manejo de Objeción',
    subtitle: 'Entrena al bot para responder con argumentos persuasivos ante dudas o indecisión.',
    fields: [
      { key: 'objecion', label: 'Objeción o Duda del Cliente', placeholder: 'Ej: Está muy caro / No tengo dinero ahora / Lo tengo que pensar', type: 'text', required: true },
      { key: 'respuesta', label: 'Argumento de Venta / Respuesta Sugerida', placeholder: 'Ej: Explica que con una sola evaluación ahorra más de 20 horas de trabajo y recupera la inversión de inmediato. Ofrece pagar en 2 partes si es necesario.', type: 'textarea', required: true },
    ],
  },
  promociones: {
    title: 'Promoción o Descuento',
    subtitle: 'Ofertas por tiempo limitado para incentivar el cierre rápido.',
    fields: [
      { key: 'titulo', label: 'Título de la Oferta', placeholder: 'Ej: 20% de Descuento por Lanzamiento', type: 'text', required: true },
      { key: 'descuento', label: 'Descuento / Precio Promocional', placeholder: 'Ej: Antes 9.000 Bs, ahora 7.250 Bs', type: 'text', required: true },
      { key: 'condiciones', label: 'Condiciones y Vigencia', placeholder: 'Ej: Válido sólo por las próximas 24 horas o hasta agotar 10 cupos.', type: 'textarea' },
    ],
  },
  seguimientos: {
    title: 'Regla de Seguimiento Inteligente (Reactivación con IA)',
    subtitle: 'Hermes analiza el contexto del chat y genera un mensaje creativo único sin repetir el mismo texto.',
    fields: [
      { key: 'tiempo', label: '1. Momento de Activación (Horas o Días de inactividad)', placeholder: 'Ej: 2 horas / 24 horas / 48 horas', type: 'text', required: true },
      { key: 'enfoque', label: '2. 🎯 Enfoque o Ángulo Comercial', placeholder: 'Ej: Recordatorio de Ahorro de Tiempo / Cupo y Oferta Reservada / Pregunta de Ayuda y Muestra / Consulta de Pago', type: 'text' },
      { key: 'pautaCreativa', label: '3. 💡 Pauta o Instrucción para la IA (Opcional)', placeholder: 'Describe la idea principal que quieres que Hermes use creativamente. Ej: Resaltar que las evaluaciones vienen listas con escala de estimación y preguntarle si necesita el material para esta semana.', type: 'textarea' },
    ],
  },
  soporte: {
    title: 'Canal o Guía de Soporte',
    subtitle: 'Instrucciones para resolver problemas técnicos o derivar con humanos.',
    fields: [
      { key: 'motivo', label: 'Motivo de Soporte', placeholder: 'Ej: Problemas para descargar el archivo / Enlace no abre', type: 'text', required: true },
      { key: 'instruccion', label: 'Instrucciones de Ayuda', placeholder: 'Ej: Verifica que tengas cuenta de Gmail para acceder a Google Drive o solicita asistencia humana para reenviar el enlace.', type: 'textarea', required: true },
    ],
  },
};

export default function ItemEditorDialog({ 
  isOpen, 
  sectionKey = 'productos', 
  item, 
  onSave, 
  onClose, 
  isSaving 
}: ItemEditorDialogProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config = SECTION_FORM_CONFIGS[sectionKey] || {
    title: 'Registro',
    subtitle: 'Completa los campos en lenguaje natural.',
    fields: [
      { key: 'nombre', label: 'Nombre / Título', placeholder: 'Escribe el nombre o título...', type: 'text', required: true },
      { key: 'descripcion', label: 'Descripción / Detalles', placeholder: 'Escribe los detalles...', type: 'textarea', required: true },
    ],
  };

  useEffect(() => {
    if (isOpen) {
      if (item) {
        const itemCopy = { ...item };
        if (sectionKey === 'productos') {
          itemCopy.embudoVenta = itemCopy.embudoVenta || itemCopy.secuenciaVenta || itemCopy.descripcion || '';
        }
        setFormData(itemCopy);
        setJsonText(JSON.stringify(itemCopy, null, 2));
      } else {
        const initial: Record<string, any> = {};
        config.fields.forEach(f => { initial[f.key] = ''; });
        setFormData(initial);
        setJsonText('{\n  \n}');
      }
      setError(null);
      setMode('form'); // Default to friendly visual form
    }
  }, [isOpen, item, sectionKey]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSave = () => {
    if (mode === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        if (item?.id) parsed.id = item.id;
        setError(null);
        onSave(parsed);
      } catch {
        setError('Formato JSON inválido. Por favor, revisa la sintaxis.');
      }
    } else {
      // Validate required fields
      for (const field of config.fields) {
        if (field.required && (!formData[field.key] || String(formData[field.key]).trim() === '')) {
          setError(`El campo "${field.label}" es obligatorio.`);
          return;
        }
      }

      const payload: Record<string, any> = { ...formData };
      if (item?.id) {
        payload.id = item.id;
      } else if (!payload.id) {
        payload.id = Date.now().toString();
      }

      setError(null);
      onSave(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {item ? `Editar ${config.title}` : `Nuevo ${config.title}`}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{config.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Form / JSON */}
            <button
              type="button"
              onClick={() => {
                if (mode === 'form') {
                  setJsonText(JSON.stringify(formData, null, 2));
                  setMode('json');
                } else {
                  try {
                    setFormData(JSON.parse(jsonText));
                    setMode('form');
                  } catch {
                    setError('Corrige el JSON antes de volver al modo visual.');
                  }
                }
              }}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1.5"
              title="Cambiar entre formulario amigable y modo código"
            >
              {mode === 'form' ? <><Code2 className="w-3.5 h-3.5" /> Modo Avanzado</> : <><FormInput className="w-3.5 h-3.5" /> Formulario Visual</>}
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Form Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {mode === 'form' ? (
            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-2">
              <p className="text-xs text-gray-500 font-mono">Editor JSON Directo:</p>
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setError(null); }}
                className="w-full flex-1 min-h-[260px] p-4 font-mono text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-900 text-green-400"
                spellCheck="false"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Registro</>}
          </button>
        </div>
      </div>
    </div>
  );
}
