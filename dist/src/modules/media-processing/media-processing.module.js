"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaProcessingModule = void 0;
const common_1 = require("@nestjs/common");
const audio_transcription_service_1 = require("./services/audio-transcription.service");
const media_vision_service_1 = require("./services/media-vision.service");
let MediaProcessingModule = class MediaProcessingModule {
};
exports.MediaProcessingModule = MediaProcessingModule;
exports.MediaProcessingModule = MediaProcessingModule = __decorate([
    (0, common_1.Module)({
        providers: [audio_transcription_service_1.AudioTranscriptionService, media_vision_service_1.MediaVisionService],
        exports: [audio_transcription_service_1.AudioTranscriptionService, media_vision_service_1.MediaVisionService],
    })
], MediaProcessingModule);
//# sourceMappingURL=media-processing.module.js.map