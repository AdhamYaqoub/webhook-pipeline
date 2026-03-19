"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db/db");
const jobQueue_1 = require("../queue/jobQueue");
const POLL_INTERVAL = 2000;
const workerLoop = async () => {
    try {
        const res = await db_1.pool.query("SELECT * FROM jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1");
        if (res.rows.length > 0) {
            const job = res.rows[0];
            await (0, jobQueue_1.processJob)(job);
        }
    }
    catch (err) {
        console.error("Worker error:", err);
    }
    finally {
        setTimeout(workerLoop, POLL_INTERVAL);
    }
};
console.log("Worker started...");
workerLoop();
