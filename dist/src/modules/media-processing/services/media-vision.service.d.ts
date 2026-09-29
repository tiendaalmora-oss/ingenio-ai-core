import { WahaMediaPayload, MediaContext } from './audio-transcription.service';
export declare class MediaVisionService {
    private readonly logger;
    analyzeImage(media: WahaMediaPayload, caption?: string, context?: MediaContext): Promise<string>;
    private resolveWahaConfig;
    private resolveWahaMediaUrl;
    private downloadImageBase64;
    private callVisionModel;
}
