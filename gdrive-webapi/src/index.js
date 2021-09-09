import https from "https";

import { readFileSync } from "fs";
import { Server } from "socket.io";

import { logger } from "./logger.js";
import Routes from "./routes.js";

const PORT = process.env.PORT || 3000;

const localHostSSL = {
  key: readFileSync("./certificates/key.pem"),
  cert: readFileSync("./certificates/cert.pem"),
};

const routes = new Routes();

const server = https.createServer(localHostSSL, routes.handler.bind(routes)); // using bind method to make sure that is routes context

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: false,
  },
});

routes.setSocketInstance(io);

io.on("connection", (socket) => {
  logger.info(`New connection: [id: ${socket.id}]`);
});

const startServer = () => {
  const { address, port } = server.address();
  logger.info(`App running at https://${address}:${port}`);
};

server.listen(PORT, startServer);
