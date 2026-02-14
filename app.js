import express from "express";
import cors from "cors";
import userRoutes from "./routes/users.js";
import wordRoutes from "./routes/word.js";
import roomRoutes from "./routes/rooms.js";
import sentencesRoutes from "./routes/sentences.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.use("/users", userRoutes);
app.use("/word", wordRoutes);
app.use("/game", roomRoutes);
app.use("/sentence", sentencesRoutes);

export default app;
