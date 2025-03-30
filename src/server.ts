import "dotenv/config";
import app from "./app.ts";
import { initSocket } from "./socket/socket.ts";

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  console.log(`Server started at on port:${PORT}`);
});

initSocket(server, app);
