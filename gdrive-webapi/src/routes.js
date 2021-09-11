import { resolve, dirname } from "path";
import { fileURLToPath, parse } from "url";

import { logger } from "./logger.js";
import FileHelper from "./fileHelper.js";
import UploadHandler from "./uploadHandler.js";
import { pipeline } from "stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultDownloadsFolder = resolve(__dirname, "../", "downloads");

export default class Routes {
  io;
  downloadsFolder;
  constructor(downloadsFolder = defaultDownloadsFolder) {
    this.downloadsFolder = downloadsFolder;
    this.fileHelper = FileHelper;
  }

  #setHeaders(response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
  }

  setSocketInstance(io) {
    this.io = io;
  }

  async defaultRoute(_request, response) {
    response.end("Hey Dude!");
  }

  async options(_request, response) {
    response.writeHead(204);
    response.end();
  }

  async post(request, response) {
    const { headers } = request;

    const {
      query: { socketId },
    } = parse(request.url, true);

    const uploadHandler = new UploadHandler({
      socketId,
      io: this.io,
      downloadsFolder: this.downloadsFolder,
    });

    const onFinish = (response) => () => {
      response.writeHead(200);
      const data = JSON.stringify({ result: "Files uploaded with success!" });
      response.end(data);
    };

    const busboy = uploadHandler.registerEvents(headers, onFinish(response));

    await pipeline(request, busboy);

    logger.info("Request finished with success!");
  }

  async get(_request, response) {
    const files = await this.fileHelper.getFileStatus(this.downloadsFolder);

    response.writeHead(200);
    response.end(JSON.stringify(files));
  }

  handler(request, response) {
    this.#setHeaders(response);

    const chosenMethod =
      this[request.method.toLowerCase()] || this.defaultRoute;
    return chosenMethod.apply(this, [request, response]);
  }
}
