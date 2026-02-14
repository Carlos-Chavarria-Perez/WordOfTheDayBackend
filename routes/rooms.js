import express from "express"
import {createRoom,getGames,joinGame,GameDetails,getLeaderboard} from "../Controllers/roomController.js"
import {requiereAuth} from "../middleware/authmiddleware.js"

const router = express.Router();

router.post("/create",requiereAuth,createRoom)
router.get("/getgames",requiereAuth,getGames)
router.post("/join/:inviteCode",requiereAuth,joinGame)
router.get("/:id", requiereAuth, GameDetails)
router.get("/leaderboard/:game_id", requiereAuth,getLeaderboard);


export default router;