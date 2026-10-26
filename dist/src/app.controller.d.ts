import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getHealth(): {
        status: string;
        service: string;
    };
    getVersion(): {
        status: string;
        service: string;
        version: string;
        commit: string;
        updatedAt: string;
    };
}
