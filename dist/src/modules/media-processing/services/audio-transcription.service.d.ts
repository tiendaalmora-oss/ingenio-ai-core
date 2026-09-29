export interface WahaMediaPayload {
    url?: string;
    data?: string;
    mimetype?: string;
    filename?: string;
}
export interface MediaContext {
    tenantId?: string;
    session?: string;
}
export declare class AudioTranscriptionService {
    private readonly logger;
    transcribe(media: WahaMediaPayload, context?: MediaContext): Promise<string>;
    private resolveWahaConfig;
    private resolveWahaMediaUrl;
    private downloadMediaBuffer;
    private sendToWhisperApi;
    private callWhisperEndpoint;
}
