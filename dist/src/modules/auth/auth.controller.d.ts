import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email?: string;
        password: string;
    }): Promise<{
        token: string;
        role: "agency_admin";
        tenantId: string;
        tenantName: string;
        name: string;
        email: string;
    } | {
        token: string;
        role: "client";
        tenantId: string;
        tenantName: string;
        name: string;
        email: string;
    }>;
    verifyMagicKey(key: string): Promise<{
        token: string;
        role: "client";
        tenantId: string;
        tenantName: string;
        name: string;
    }>;
    getMe(authHeader?: string): Promise<import("./auth.service").AuthTokenPayload | {
        role: string;
        tenantId: string;
        tenantName: string;
        name: string;
    }>;
}
