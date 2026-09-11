import { Router } from "express";
import { getSearchHandler, getServiceNetworkPathHandler } from "../controllers/search.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get("/", getSearchHandler);
searchRouter.get("/services/:serviceCode/network-path", getServiceNetworkPathHandler);