export interface WahaMediaPayload {
    url?: string;
    data?: string;
    mimetype?: string;
    filename?: string;
}
export declare class AudioTranscriptionService {
    private readonly logger;
    transcribe(media: WahaMediaPayload): Promise<string>;
    private downloadMediaBuffer;
    private resolveWahaMediaUrl;
    private sendToWhisperApi;
    private callWhisperEndpoint;
}
