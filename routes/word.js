// routes/word.routes.js
import express from "express";
import { getRandomWordData } from "../controllers/WordofDayController.js";

const router = express.Router();

router.get("/random-word", getRandomWordData);

export default router;
