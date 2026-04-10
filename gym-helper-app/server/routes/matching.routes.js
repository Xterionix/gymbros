import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    getActiveMatch,
    getDiscoveryUsers,
    getPendingMatches,
    likeUser,
    unmatchUser,
} from "../controllers/matching.controller.js";

const router = express.Router();

router.get("/discovery", authenticate, getDiscoveryUsers);
router.get("/active", authenticate, getActiveMatch);
router.get("/pending", authenticate, getPendingMatches);
router.post("/like/:targetId", authenticate, likeUser);
router.post("/unmatch/:targetId", authenticate, unmatchUser);

export default router;
