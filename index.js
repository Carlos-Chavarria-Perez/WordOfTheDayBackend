import dotenv from "dotenv";
import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { registerRoomSocket } from "./sockets/roomSocket.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
let ioInstance
export const getIO=()=>ioInstance

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

ioInstance=io
registerRoomSocket(io)

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server Running on PORT " + PORT);
});
