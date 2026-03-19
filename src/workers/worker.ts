import { pool } from "../db/db";
import { processJob } from "../queue/jobQueue";

const POLL_INTERVAL = 2000; 

const workerLoop = async () => {
  try {
    const res = await pool.query(
      "SELECT * FROM jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1"
    );

    if (res.rows.length > 0) {
      const job = res.rows[0];
      await processJob(job);
    }
  } catch (err) {
    console.error("Worker error:", err);
  } finally {
    setTimeout(workerLoop, POLL_INTERVAL);
  }
};

console.log("Worker started...");
workerLoop();