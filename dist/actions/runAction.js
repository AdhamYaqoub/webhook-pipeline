"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAction = void 0;
const transform_1 = __importDefault(require("./transform"));
const filter_1 = __importDefault(require("./filter"));
const enrich_1 = __importDefault(require("./enrich"));
const runAction = async (actionType, payload) => {
    switch (actionType) {
        case "transform":
            return (0, transform_1.default)(payload);
        case "filter":
            return (0, filter_1.default)(payload);
        case "enrich":
            return (0, enrich_1.default)(payload);
        default:
            throw new Error("Unknown action type");
    }
};
exports.runAction = runAction;
