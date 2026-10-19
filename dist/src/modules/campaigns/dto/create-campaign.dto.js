"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateAudienceDto = exports.CreateCampaignDto = exports.TargetFiltersDto = void 0;
class TargetFiltersDto {
    leadStatus;
    product;
    products;
    tags;
}
exports.TargetFiltersDto = TargetFiltersDto;
class CreateCampaignDto {
    name;
    channel;
    targetFilters;
    messageTemplate;
    mediaUrl;
    mediaType;
    mediaFilename;
    subject;
    dripIntervalSeconds;
    autoStart;
}
exports.CreateCampaignDto = CreateCampaignDto;
class EstimateAudienceDto {
    leadStatus;
    product;
    products;
    tags;
    channel;
}
exports.EstimateAudienceDto = EstimateAudienceDto;
//# sourceMappingURL=create-campaign.dto.js.map