import { Request, Response } from "express";
import { pool } from "../db/db";
import { v4 as uuidv4 } from "uuid";

export const receiveWebhook = async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const payload = req.body;

    // أنشئ job جديد في queue
    const jobId = uuidv4();
    await pool.query(
      "INSERT INTO jobs (id, pipeline_id, payload, status, attempts) VALUES ($1,$2,$3,'pending',0)",
      [jobId, pipelineId, payload]
    );

    res.status(202).json({ message: "Webhook received and queued", jobId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to queue webhook" });
  }
};