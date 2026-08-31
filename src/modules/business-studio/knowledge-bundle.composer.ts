import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeBundleComposer {
  
  /**
   * Generates a clean, structured Knowledge Bundle artifact from raw BackOffice sections,
   * seamlessly supporting natural language text, markdown, prompts, arrays, and objects.
   */
  compose(rawData: any) {
    const raw = rawData || {};
    
    // Normalizar identidad (soporta texto plano natural o campos estructurados)
    let identity: any;
    if (typeof raw.identidad === 'string') {
      identity = raw.identidad;
    } else if (raw.identidad && typeof raw.identidad === 'object') {
      if (raw.identidad.prompt) {
        identity = raw.identidad.prompt;
      } else {
        identity = {
          nombre: raw.identidad.nombre || "Asistente Virtual",
          tono: raw.identidad.tono || "Profesional, conciso, empático y vendedor",
          rol: raw.identidad.rol || "Asistente de ventas y atención al cliente",
          objetivo: raw.identidad.objetivo || "Vender, calificar prospectos y responder dudas de forma persuasiva"
        };
      }
    } else {
      identity = "Asistente Virtual de ventas y atención al cliente.";
    }

    // Normalizar empresa (soporta texto plano natural o campos estructurados)
    let business: any;
    if (typeof raw.empresa === 'string') {
      business = raw.empresa;
    } else if (raw.empresa && typeof raw.empresa === 'object') {
      if (raw.empresa.prompt) {
        business = raw.empresa.prompt;
      } else {
        business = {
          nombre: raw.empresa.nombre || "",
          descripcion: raw.empresa.descripcion || "",
          sitioWeb: raw.empresa.sitioWeb || "",
          ubicacion: raw.empresa.ubicacion || "",
          contacto: raw.empresa.contacto || ""
        };
      }
    } else {
      business = "Información general del negocio.";
    }

    // Normalizar enrutamiento / embudo de venta
    let routing: any;
    if (typeof raw.enrutamiento === 'string') {
      routing = raw.enrutamiento;
    } else if (raw.enrutamiento && typeof raw.enrutamiento === 'object') {
      routing = raw.enrutamiento.prompt || raw.enrutamiento.estrategia || JSON.stringify(raw.enrutamiento, null, 2);
    } else {
      routing = "";
    }

    return {
      identity,
      business,
      routing,
      botRules: raw.reglasBot || {},
      products: {
         categories: raw.categorias || [],
         items: Array.isArray(raw.productos)
           ? raw.productos.map((p: any) => ({
               id: p.id,
               nombre: p.nombre || p.name || '',
               embudoVenta: p.embudoVenta || p.secuenciaVenta || p.descripcion || p.description || '',
               baseConocimiento: p.baseConocimiento || p.detallesTecnicos || '',
               categoria: p.categoria || p.category || '',
               link: p.link || p.enlace || '',
             }))
           : []
      },
      services: raw.servicios || [],
      faqs: raw.faqs || [],
      sales: {
         scripts: raw.scriptsComerciales || [],
         promotions: raw.promociones || []
      },
      objections: raw.objeciones || [],
      followups: raw.seguimientos || [],
      support: raw.soporte || [],
      policies: raw.politicasAtencion || [],
      restrictions: [
        "Nunca inventes información que no esté en este bundle de conocimiento.",
        "Limítate a los productos, servicios, precios y políticas detalladas en este conocimiento.",
        "Si el usuario pregunta algo fuera de este conocimiento o no especificado, indícale amablemente que consultarás con el equipo y ofrece derivar a un humano."
      ]
    };
  }
}
