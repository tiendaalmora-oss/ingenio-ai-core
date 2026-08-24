import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeBundleComposer {
  
  /**
   * Generates a clean, structured Knowledge Bundle artifact from raw BackOffice sections.
   */
  compose(rawData: any) {
    return {
      identity: "Asistente Virtual Inteligente de la empresa.",
      business: "Información general del negocio y operaciones.",
      products: {
         categories: rawData.categorias || [],
         items: rawData.productos || []
      },
      services: rawData.servicios || [],
      faqs: rawData.faqs || [],
      sales: {
         scripts: rawData.scriptsComerciales || [],
         promotions: rawData.promociones || []
      },
      objections: rawData.objeciones || [],
      followups: rawData.seguimientos || [],
      support: rawData.soporte || [],
      policies: rawData.politicasAtencion || [],
      restrictions: [
        "Nunca inventes información que no esté en este bundle.",
        "Limítate a los productos, servicios y políticas detalladas aquí.",
        "Si el usuario pregunta algo fuera de este conocimiento, indica que no tienes esa información y ofrece derivar a un humano."
      ]
    };
  }
}
