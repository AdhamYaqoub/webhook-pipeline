import { pool } from "../db/db";
import { sendToSubscribers } from "../queue/delivery";
import { runAction } from "../actions/runAction";

export const processJob = async (job: any) => {
  const { id, pipeline_id, payload } = job;

  try {
    // mark as processing
    await pool.query("UPDATE jobs SET status='processing' WHERE id=$1", [id]);

    // جلب نوع action من pipeline
    const pipelineRes = await pool.query(
      "SELECT action_type FROM pipelines WHERE id=$1",
      [pipeline_id]
    );
    const actionType = pipelineRes.rows[0].action_type;

    // تنفيذ action
    const result = await runAction(actionType, payload);

    // إرسال للمشتركين
    await sendToSubscribers(id, pipeline_id, result);

    // تحديث job كـ completed
    await pool.query(
      "UPDATE jobs SET status='completed', processed_at=NOW() WHERE id=$1",
      [id]
    );
  } catch (err) {
    console.error("Job processing failed:", err);
    await pool.query(
      "UPDATE jobs SET status='failed', attempts=attempts+1 WHERE id=$1",
      [id]
    );
  }
};