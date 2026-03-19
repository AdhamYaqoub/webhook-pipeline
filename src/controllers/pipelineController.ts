import { Request, Response } from "express"
import { pool } from "../db/db"
import { v4 as uuidv4 } from "uuid"

export const createPipeline = async (req: Request, res: Response) => {
  try {
    const { name, actionType, subscribers } = req.body

    const pipelineId = uuidv4()

    await pool.query(
      "INSERT INTO pipelines (id, name, action_type) VALUES ($1,$2,$3)",
      [pipelineId, name, actionType]
    )

    for (const url of subscribers) {
      await pool.query(
        "INSERT INTO subscribers (id, pipeline_id, url) VALUES ($1,$2,$3)",
        [uuidv4(), pipelineId, url]
      )
    }

    res.json({
      id: pipelineId,
      name,
      actionType,
      subscribers
    })
  } catch (error) {
    res.status(500).json({ error: "failed to create pipeline" })
  }
}