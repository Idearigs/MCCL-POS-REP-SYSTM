"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSessionDto = exports.StockTakeStatus = void 0;
const class_validator_1 = require("class-validator");
var StockTakeStatus;
(function (StockTakeStatus) {
    StockTakeStatus["DRAFT"] = "DRAFT";
    StockTakeStatus["IN_PROGRESS"] = "IN_PROGRESS";
    StockTakeStatus["COMPLETED"] = "COMPLETED";
    StockTakeStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    StockTakeStatus["APPROVED"] = "APPROVED";
    StockTakeStatus["REJECTED"] = "REJECTED";
    StockTakeStatus["CANCELLED"] = "CANCELLED";
})(StockTakeStatus || (exports.StockTakeStatus = StockTakeStatus = {}));
class UpdateSessionDto {
    sessionName;
    location;
    remarks;
    status;
}
exports.UpdateSessionDto = UpdateSessionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "sessionName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "remarks", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(StockTakeStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "status", void 0);
//# sourceMappingURL=update-session.dto.js.map