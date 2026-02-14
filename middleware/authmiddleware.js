import jwt from "jsonwebtoken";
import { pool } from "../models/db.js";

export const requiereAuth = async(req,res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check session against DB
    const result= await pool.query(
      `
      SELECT current_token FROM t_users WHERE user_id =$1
      `, [decoded.user_id]
    )
    if(result.rows.length===0 || result.rows[0].current_token !== token){
      return res.status(401).json({error:"Session Expired"})
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
