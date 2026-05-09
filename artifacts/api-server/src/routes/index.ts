import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentRouter from "./agent";
import vaultRouter from "./vault";
import decisionsRouter from "./decisions";
import protocolsRouter from "./protocols";
import nftRouter from "./nft";
import executeRouter from "./execute";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentRouter);
router.use(vaultRouter);
router.use(decisionsRouter);
router.use(protocolsRouter);
router.use(nftRouter);
router.use(executeRouter);

export default router;
