import { Test, TestingModule } from '@nestjs/testing';
import { AudioTranscriptionService } from './audio-transcription.service';
import { MediaVisionService } from './media-vision.service';

describe('MediaProcessing Services', () => {
  let audioService: AudioTranscriptionService;
  let visionService: MediaVisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioTranscriptionService, MediaVisionService],
    }).compile();

    audioService = module.get<AudioTranscriptionService>(AudioTranscriptionService);
    visionService = module.get<MediaVisionService>(MediaVisionService);
  });

  it('should be defined', () => {
    expect(audioService).toBeDefined();
    expect(visionService).toBeDefined();
  });

  describe('AudioTranscriptionService', () => {
    it('should return fallback if no audio buffer is available', async () => {
      const result = await audioService.transcribe({});
      expect(result).toContain('[Nota de voz');
    });
  });

  describe('MediaVisionService', () => {
    it('should return fallback with caption if image buffer is not available', async () => {
      const result = await visionService.analyzeImage({}, 'Comprobante de pago');
      expect(result).toContain('Comprobante de pago');
    });
  });
});
