import axios from "axios";
import { pool } from "../db/db";
import { v4 as uuidv4 } from "uuid";

const MAX_RETRIES = 3;

export const sendToSubscribers = async (jobId: string, pipelineId: string, data: any) => {
  if (!data) return;

  const res = await pool.query("SELECT url FROM subscribers WHERE pipeline_id=$1", [pipelineId]);
  const subscribers = res.rows;

  for (const sub of subscribers) {
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        const response = await axios.post(sub.url, data);
        await pool.query(
          "INSERT INTO deliveries (id, job_id, subscriber_url, status, attempt, response_code) VALUES ($1,$2,$3,'success',$4,$5)",
          [uuidv4(), jobId, sub.url, attempt + 1, response.status]
        );
        success = true;
      } catch (err: any) {
        attempt++;
        await pool.query(
          "INSERT INTO deliveries (id, job_id, subscriber_url, status, attempt, response_code) VALUES ($1,$2,$3,'failed',$4,$5)",
          [uuidv4(), jobId, sub.url, attempt, err.response?.status || 0]
        );
        await new Promise((r) => setTimeout(r, attempt * 1000)); // exponential backoff
      }
    }
  }
};