"use strict";
/**
 * Core Type Definitions and Interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailStatus = exports.CampaignStatus = exports.EmailValidationStatus = void 0;
var EmailValidationStatus;
(function (EmailValidationStatus) {
    EmailValidationStatus["VALID"] = "VALID";
    EmailValidationStatus["INVALID"] = "INVALID";
    EmailValidationStatus["RISKY"] = "RISKY";
    EmailValidationStatus["UNKNOWN"] = "UNKNOWN";
})(EmailValidationStatus || (exports.EmailValidationStatus = EmailValidationStatus = {}));
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus["DRAFT"] = "Draft";
    CampaignStatus["SCHEDULED"] = "Scheduled";
    CampaignStatus["SENDING"] = "Sending";
    CampaignStatus["PAUSED"] = "Paused";
    CampaignStatus["COMPLETED"] = "Completed";
    CampaignStatus["CANCELLED"] = "Cancelled";
    CampaignStatus["FAILED"] = "Failed";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
var EmailStatus;
(function (EmailStatus) {
    EmailStatus["QUEUED"] = "queued";
    EmailStatus["SENT"] = "sent";
    EmailStatus["DELIVERED"] = "delivered";
    EmailStatus["FAILED"] = "failed";
    EmailStatus["BOUNCED"] = "bounced";
    EmailStatus["SKIPPED"] = "skipped";
})(EmailStatus || (exports.EmailStatus = EmailStatus = {}));
//# sourceMappingURL=index.js.map