"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairsModule = exports.SalesModule = exports.ProductsModule = exports.CustomersModule = exports.AuthModule = void 0;
var auth_module_1 = require("./auth/auth.module");
Object.defineProperty(exports, "AuthModule", { enumerable: true, get: function () { return auth_module_1.AuthModule; } });
var customers_module_1 = require("./customers/customers.module");
Object.defineProperty(exports, "CustomersModule", { enumerable: true, get: function () { return customers_module_1.CustomersModule; } });
var products_module_1 = require("./inventory/products.module");
Object.defineProperty(exports, "ProductsModule", { enumerable: true, get: function () { return products_module_1.ProductsModule; } });
var sales_module_1 = require("./sales/sales.module");
Object.defineProperty(exports, "SalesModule", { enumerable: true, get: function () { return sales_module_1.SalesModule; } });
var repairs_module_1 = require("./repairs/repairs.module");
Object.defineProperty(exports, "RepairsModule", { enumerable: true, get: function () { return repairs_module_1.RepairsModule; } });
//# sourceMappingURL=index.js.map