"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToSubscribers = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db/db");
const uuid_1 = require("uuid");
const MAX_RETRIES = 3;
const sendToSubscribers = async (jobId, pipelineId, data) => {
    if (!data)
        return;
    const res = await db_1.pool.query("SELECT url FROM subscribers WHERE pipeline_id=$1", [pipelineId]);
    const subscribers = res.rows;
    for (const sub of subscribers) {
        let attempt = 0;
        let success = false;
        while (attempt < MAX_RETRIES && !success) {
            try {
                const response = await axios_1.default.post(sub.url, data);
                await db_1.pool.query("INSERT INTO deliveries (id, job_id, subscriber_url, status, attempt, response_code) VALUES ($1,$2,$3,'success',$4,$5)", [(0, uuid_1.v4)(), jobId, sub.url, attempt + 1, response.status]);
                success = true;
            }
            catch (err) {
                attempt++;
                await db_1.pool.query("INSERT INTO deliveries (id, job_id, subscriber_url, status, attempt, response_code) VALUES ($1,$2,$3,'failed',$4,$5)", [(0, uuid_1.v4)(), jobId, sub.url, attempt, err.response?.status || 0]);
                await new Promise((r) => setTimeout(r, attempt * 1000)); // exponential backoff
            }
        }
    }
};
exports.sendToSubscribers = sendToSubscribers;
