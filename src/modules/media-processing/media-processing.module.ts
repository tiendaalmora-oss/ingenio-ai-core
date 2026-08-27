import { Module } from '@nestjs/common';
import { AudioTranscriptionService } from './services/audio-transcription.service';
import { MediaVisionService } from './services/media-vision.service';

@Module({
  providers: [AudioTranscriptionService, MediaVisionService],
  exports: [AudioTranscriptionService, MediaVisionService],
})
export class MediaProcessingModule {}
