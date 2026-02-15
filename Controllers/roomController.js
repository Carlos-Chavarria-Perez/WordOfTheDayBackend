import { pool } from "../models/db.js";
import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateInviteCode = customAlphabet(alphabet, 6);

export const createRoom = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id;
    const { game_name } = req.body;

    await client.query("BEGIN");

    let inviteCode;
    let gameId;

    while (true) {
      inviteCode = generateInviteCode();

      try {
        const gameResult = await client.query(
          `
          INSERT INTO t_games (created_by, game_name, invite_code)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [userId, game_name, inviteCode],
        );

        gameId = gameResult.rows[0].id;
        break; // success → exit loop
      } catch (error) {
        if (error.code === "23505") {
          // duplicate invite_code → try again
          continue;
        }
        throw error;
      }
    }

    // Add creator as word chooser
    await client.query(
      `
      INSERT INTO t_game_players (game_id, user_id, is_word_chooser)
      VALUES ($1, $2, true)
      `,
      [gameId, userId],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Room Created",
      game_id: gameId,
      invite_code: inviteCode,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to create room" });
  } finally {
    client.release();
  }
};

export const getGames = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `
      SELECT g.id, g.game_name, g.created_at,current_round
      FROM t_games g
      JOIN t_game_players gp ON gp.game_id = g.id
      WHERE gp.user_id = $1
      ORDER BY g.created_at DESC
            `,
      [userId],
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get games" });
  }
};

export const joinGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { inviteCode } = req.params;

    const gameResult  = await pool.query(
      `
      SELECT id FROM t_games WHERE invite_code= $1
      
      `,
      [inviteCode],
    );

    if (gameResult.rows.length === 0) {
      return res.status(500).json({ error: "Game not Found" });
    }

    const game_id = gameResult.rows[0].id;

    await pool.query(
      `
        INSERT INTO t_game_players (game_id,user_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING

      `,
      [game_id, userId],
    );
    return res.json({ message: "Joined Game", game_id: game_id });
  } catch (error) {
    return res.status(500).json({ error: "Failed to join Game" });
  }
};

export const GameDetails = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { id } = req.params;

    const playerResult = await pool.query(
      `
      SELECT is_word_chooser
      FROM t_game_players
      WHERE game_id = $1 and user_id=$2
      `,
      [id, user_id],
    );

    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: "Not part of this game" });
    }

    const iswordChooser = playerResult.rows[0].is_word_chooser;

        const gameResult = await pool.query(
      `
      SELECT invite_code,game_name
      FROM t_games
      WHERE id = $1
      `,
      [id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    const inviteCode = gameResult.rows[0].invite_code;
    const gamename = gameResult.rows[0].game_name;

    const players = await pool.query(
      `
      SELECT u.username
      FROM t_game_players gp
      JOIN t_users u ON u.user_id = gp.user_id
      WHERE gp.game_id = $1
      ORDER BY gp.joined_at
      `,
      [id],
    );

    return res.json({
      game_id: id,
      is_word_chooser: iswordChooser,
      players: players.rows,
      invite_code:inviteCode,
      game_name: gamename
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load game" });
  }
};
export const getLeaderboard = async (req, res) => {
  try {
    const { game_id } = req.params;

    const leaderboard = await pool.query(
      `
  SELECT u.username, gp.points
  FROM t_game_players gp
  JOIN t_users u ON u.user_id = gp.user_id
  WHERE gp.game_id = $1
    AND gp.is_word_chooser = false
  ORDER BY gp.points DESC
  `,
      [game_id],
    );

    res.json(leaderboard.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get Leaderboard" });
  }
};
