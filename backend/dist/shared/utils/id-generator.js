"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
const cuid2_1 = require("@paralleldrive/cuid2");
function generateId() {
    return (0, cuid2_1.createId)();
}
//# sourceMappingURL=id-generator.js.map