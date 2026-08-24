import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeBundleComposer {
  
  /**
   * Generates a clean, structured Knowledge Bundle artifact from raw BackOffice sections.
   */
  compose(rawData: any) {
    const raw = rawData || {};
    const identidad = raw.identidad || {};
    const empresa = raw.empresa || {};

    return {
      identity: {
        nombre: identidad.nombre || "Asistente Virtual",
        tono: identidad.tono || "Profesional, conciso, empático y vendedor",
        rol: identidad.rol || "Asistente de ventas y atención al cliente",
        objetivo: identidad.objetivo || "Vender, calificar prospectos y responder dudas de forma persuasiva"
      },
      business: {
        nombre: empresa.nombre || "",
        descripcion: empresa.descripcion || "",
        sitioWeb: empresa.sitioWeb || "",
        ubicacion: empresa.ubicacion || "",
        contacto: empresa.contacto || ""
      },
      products: {
         categories: raw.categorias || [],
         items: raw.productos || []
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
