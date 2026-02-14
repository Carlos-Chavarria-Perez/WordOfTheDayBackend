import { pool } from "../models/db.js";
import { getIO } from "../index.js";

export const createSentence = async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const { game_id, sentence } = req.body;

    await client.query("BEGIN");
    const result = await client.query(
      `
            INSERT INTO t_submitted_sentences(game_id,user_id,sentence)
            VALUES($1, $2, $3)
            RETURNING *
            `,
      [game_id, user_id, sentence],
    );
    await client.query("COMMIT");
    const newSentence = result.rows[0];

    // BroadCast to Room
    const io = getIO();
    io.to(game_id).emit("sentence:new", newSentence);

    return res.json(newSentence);
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to submit sentence" });
  } finally {
    client.release();
  }
};

export const getSentences = async (req, res) => {
  try {
    const { game_id } = req.params;

    const result = await pool.query(
      `
            SELECT s.*, username
            FROM t_submitted_sentences s
            JOIN t_users u on u.user_id = s.user_id
            WHERE s.game_id= $1
            ORDER BY s.created_at ASC
            `,
      [game_id],
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to load sentences" });
  }
};

export const reviewSentence = async (req, res) => {
  const client = await pool.connect();

  try {
    const { game_id, sentence_owner_id, approved, points } = req.body;

    const safePoints = Math.max(0, Math.min(points ?? 0, 100));

    await client.query("BEGIN");

    const sentenceResult = await client.query(
      `
      UPDATE t_submitted_sentences
      SET approved= $3
      WHERE game_id= $1 AND user_id= $2
      RETURNING *
      `,
      [game_id, sentence_owner_id, approved],
    );

    const updatedSentence = sentenceResult.rows[0];

    if (approved && safePoints > 0) {
      await client.query(
        `
                UPDATE t_game_players
                SET points= points + $3
                WHERE game_id= $1 AND user_id=$2                
                `,
        [game_id, sentence_owner_id, safePoints],
      );
    }

    const leaderBoardResult = await client.query(
      `
        SELECT u.username, gp.user_id, gp.points
        FROM t_game_players gp
        JOIN t_users u ON u.user_id =gp.user_id
        WHERE gp.game_id =$1
        AND gp.is_word_chooser = false
        ORDER BY gp.points DESC
        `,
      [game_id],
    );
    await client.query("COMMIT");

    const io = getIO();

    // ✅ chooser updates sentence list
    io.to(game_id).emit("sentence:update", updatedSentence);

    // ✅ submitter sees their personal result
    io.to(game_id).emit("sentence:result", {
      user_id: sentence_owner_id,
      approved,
      points: safePoints,
    });

    // ✅ leaderboard update
    io.to(game_id).emit("leaderboard:update", leaderBoardResult.rows);

    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to review sentence" });
  } finally {
    client.release();
  }
};

export const resetRound = async (req, res) => {
  const client = await pool.connect();

  try {
    const { game_id } = req.params;

    await client.query("BEGIN");

    // increment round
    const roundResult = await client.query(
      `
      UPDATE t_games
      SET current_round = current_round + 1
      WHERE id = $1
      RETURNING current_round
      `,
      [game_id],
    );

    const newRound = roundResult.rows[0].round;

    // delete sentences
    await client.query(
      `
      DELETE FROM t_submitted_sentences
      WHERE game_id = $1
      `,
      [game_id],
    );

    await client.query("COMMIT");

    const io = getIO();
    io.to(game_id).emit("round:reset", { round: newRound });

    return res.json({ round: newRound });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to reset round" });
  } finally {
    client.release();
  }
};
