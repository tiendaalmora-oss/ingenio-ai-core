import { WahaMediaPayload } from './audio-transcription.service';
export declare class MediaVisionService {
    private readonly logger;
    analyzeImage(media: WahaMediaPayload, caption?: string): Promise<string>;
    private downloadImageBase64;
    private resolveWahaMediaUrl;
    private callVisionModel;
}
