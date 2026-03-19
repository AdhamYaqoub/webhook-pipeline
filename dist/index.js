"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const server_1 = require("./server");
const worker_1 = require("./worker");
const config_1 = require("./config");
dotenv_1.default.config();
async function main() {
    const app = (0, server_1.createServer)();
    app.listen(config_1.config.port, () => {
        // eslint-disable-next-line no-console
        console.log(`Webhook pipeline service listening on port ${config_1.config.port}`);
    });
    (0, worker_1.startWorkerLoop)();
}
void main();
