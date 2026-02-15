import crypto from "crypto";

const rooms = new Map();

export function registerRoomSocket(io) {
  io.on("connection", (socket) => {
    const { user_id } = socket.handshake.auth;

    if (!user_id) {
      socket.disconnect();
      return;
    }
    socket.user_id = user_id;

    console.log("✅ Socket connected", socket.id, "User:", user_id);

    socket.on("error", (error) => {
      console.error("Socket error for", socket.id, ":", error);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connect error for", socket.id, ":", error);
    });

    // Join Room
    socket.on("room:join", ({ roomId, isChooser }) => {
      // <--- Receive isChooser
      let room = rooms.get(roomId);

      if (!room) {
        room = {
          id: roomId,
          users: [],
          wordChooser: null, // We will set this below
          word: null,
        };
        rooms.set(roomId, room);
      }

      // If this specific socket connection IS the chooser according to DB
      if (isChooser) {
        room.wordChooser = socket.user_id;
      }

      if (!room.users.includes(socket.user_id)) {
        room.users.push(socket.user_id);
      }

      socket.join(roomId);

      io.to(roomId).emit("room:updated", room);

      if (room.word) {
        socket.emit("word:selected", room.word);
      }
    });

    // Reset Room
    socket.on("word:choose", ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (room.wordChooser !== socket.user_id) return;

      room.word = word;

      io.to(roomId).emit("round:reset"); // notify clients
      io.to(roomId).emit("word:selected", word);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("❌ Disconnected", socket.id, socket.user_id);
    });
  });
}
