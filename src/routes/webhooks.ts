import { Router } from "express";
import { receiveWebhook } from "../controllers/webhookController";

const router = Router();

router.post("/:pipelineId", receiveWebhook);

export default router;