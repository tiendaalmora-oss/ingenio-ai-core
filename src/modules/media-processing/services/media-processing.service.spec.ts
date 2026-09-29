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

    it('debe enrutar la descarga de audio a WAHA_SANDBOX_URL para subcuentas', async () => {
      process.env.WAHA_SANDBOX_URL = 'https://waha-sandbox.ingeniodigital.shop';
      process.env.WAHA_SANDBOX_API_KEY = 'sandbox-key';
      process.env.WAHA_PROD_URL = 'https://waha.ingeniodigital.shop';

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation((url: any, opts: any) => {
        expect(url).toContain('https://waha-sandbox.ingeniodigital.shop/api/files/test.ogg');
        expect(opts.headers['X-Api-Key']).toBe('sandbox-key');
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        } as any);
      });

      jest.spyOn<any, any>(audioService, 'sendToWhisperApi').mockResolvedValue('Hola curso de cejas');

      const result = await audioService.transcribe(
        { url: 'http://localhost:3000/api/files/test.ogg', mimetype: 'audio/ogg' },
        { session: 'sub_79b3fc7f8c', tenantId: '79b3fc7f-8c3a-4fe0-8d27-82f7dbacd364' }
      );

      expect(result).toContain('Hola curso de cejas');
      fetchSpy.mockRestore();
    });

    it('debe enrutar la descarga de audio a WAHA_PROD_URL para la sesión ferreos', async () => {
      process.env.WAHA_PROD_URL = 'https://waha.ingeniodigital.shop';
      process.env.WAHA_PROD_API_KEY = 'prod-key';

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation((url: any, opts: any) => {
        expect(url).toContain('https://waha.ingeniodigital.shop/api/files/ferreos.ogg');
        expect(opts.headers['X-Api-Key']).toBe('prod-key');
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        } as any);
      });

      jest.spyOn<any, any>(audioService, 'sendToWhisperApi').mockResolvedValue('Consulta docentes');

      const result = await audioService.transcribe(
        { url: 'http://localhost:3000/api/files/ferreos.ogg', mimetype: 'audio/ogg' },
        { session: 'ferreos', tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' }
      );

      expect(result).toContain('Consulta docentes');
      fetchSpy.mockRestore();
    });
  });

  describe('MediaVisionService', () => {
    it('should return fallback with caption if image buffer is not available', async () => {
      const result = await visionService.analyzeImage({}, 'Comprobante de pago');
      expect(result).toContain('Comprobante de pago');
    });

    it('debe enrutar la descarga de imagen a WAHA_SANDBOX_URL para subcuentas', async () => {
      process.env.WAHA_SANDBOX_URL = 'https://waha-sandbox.ingeniodigital.shop';
      process.env.WAHA_SANDBOX_API_KEY = 'sandbox-key';

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation((url: any, opts: any) => {
        expect(url).toContain('https://waha-sandbox.ingeniodigital.shop/api/files/pago.jpg');
        expect(opts.headers['X-Api-Key']).toBe('sandbox-key');
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        } as any);
      });

      jest.spyOn<any, any>(visionService, 'callVisionModel').mockResolvedValue('📸 [Comprobante de Pago Detectado]');

      const result = await visionService.analyzeImage(
        { url: 'http://localhost:3000/api/files/pago.jpg', mimetype: 'image/jpeg' },
        undefined,
        { session: 'sub_79b3fc7f8c', tenantId: '79b3fc7f-8c3a-4fe0-8d27-82f7dbacd364' }
      );

      expect(result).toBe('📸 [Comprobante de Pago Detectado]');
      fetchSpy.mockRestore();
    });
  });
});
