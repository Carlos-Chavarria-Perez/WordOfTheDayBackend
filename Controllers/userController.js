import { pool } from "../models/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate Inputs
    if (!username || !password) {
      return res.status(400).json({ error: "Username and Password Requiered" });
    }
    // TODO add special character to avoid having to change password hacerlo con 16 poner que no se puede recuperar? special character 
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT 1 FROM T_Users WHERE username=$1",
      [username],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "User already taken" });
    }
    // Password Hashing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert User
    const result = await pool.query(
      "INSERT INTO T_Users (username,password) VALUES($1,$2) RETURNING user_id, username",
      [username, hashedPassword],
    );

    // Success
    res
      .status(201)
      .json({ message: "User registered succesfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Server error during registration" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Validate Inputs
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password requiered" });
    }

    // Find User in DB
    const result = await pool.query(
      "SELECT user_id,username,password FROM T_Users WHERE username=$1",
      [username],
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    
        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // 🔐 CREATE TOKEN
    const token = jwt.sign(
      { user_id: user.user_id,username:user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // store session token

    await pool.query(`
      UPDATE t_users
      SET current_token =$1
      WHERE user_id= $2
      `, [token, user.user_id])

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};

// TODO Create reset password fucntion 