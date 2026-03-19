"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const pipelines_1 = require("./web/pipelines");
const webhooks_1 = require("./web/webhooks");
const jobs_1 = require("./web/jobs");
function createServer() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, morgan_1.default)('dev'));
    app.get('/healthz', (_req, res) => {
        res.json({ ok: true });
    });
    (0, pipelines_1.registerPipelineRoutes)(app);
    (0, webhooks_1.registerWebhookRoutes)(app);
    (0, jobs_1.registerJobRoutes)(app);
    return app;
}
