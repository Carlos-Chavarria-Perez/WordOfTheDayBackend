import express from "express";
import {
  createSentence,
  getSentences,
  reviewSentence,resetRound,
} from "../Controllers/sentenceController.js";
import { requiereAuth } from "../middleware/authmiddleware.js";

const router = express.Router();

router.get("/:game_id", requiereAuth, getSentences);


router.post("/", requiereAuth, createSentence);

router.post("/review", requiereAuth, reviewSentence);
router.post("/reset/:game_id", requiereAuth,resetRound)
export default router;
