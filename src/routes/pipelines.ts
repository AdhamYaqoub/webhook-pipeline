import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/db";

import { Request, Response } from "express";

export async function createPipeline(req: Request, res: Response) {  try {
    const { name, action_type } = req.body;

    const id = uuidv4();

    await pool.query(
      "INSERT INTO pipelines (id,name,action_type) VALUES ($1,$2,$3)",
      [id, name, action_type]
    );

    res.json({ id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to create pipeline" });
  }
}