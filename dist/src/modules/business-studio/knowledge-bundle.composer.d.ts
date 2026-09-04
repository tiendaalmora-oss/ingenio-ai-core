export declare class KnowledgeBundleComposer {
    compose(rawData: any): {
        identity: any;
        business: any;
        routing: any;
        botRules: any;
        products: {
            categories: any;
            items: any;
        };
        services: any;
        faqs: any;
        sales: {
            scripts: any;
            promotions: any;
        };
        objections: any;
        followups: any;
        support: any;
        policies: any;
        restrictions: string[];
    };
}
