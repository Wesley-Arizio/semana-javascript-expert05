import Busboy from "busboy";
import { pipeline } from "stream/promises";
import fs from "fs";

import { logger } from "./logger.js";

export default class UploadHandler {
  io;
  socketId;
  downloadsFolder;
  constructor({ io, socketId, downloadsFolder, messageTimeDelay = 200 }) {
    this.io = io;
    this.socketId = socketId;
    this.downloadsFolder = downloadsFolder;
    this.ON_UPLOAD_EVENT = "file-upload";
    this.messageTimeDelay = messageTimeDelay;
  }

  canExecute(lastExecution) {
    const d = Date.now() - lastExecution;
    return d >= this.messageTimeDelay;
  }

  handleFileBytes(filename) {
    this.lastMessageSent = Date.now();

    async function* handleData(source) {
      let processAlready = 0;

      for await (const chunk of source) {
        yield chunk;

        processAlready += chunk.length;
        if (!this.canExecute(this.lastMessageSent)) {
          continue;
        }

        this.lastMessageSent = Date.now();

        this.io
          .to(this.socketId)
          .emit(this.ON_UPLOAD_EVENT, { processAlready, filename });

        logger.info(
          `File [${filename}] got ${processAlready} bytes to ${this.socketId}`
        );
      }
    }

    return handleData.bind(this);
  }

  async onFile(fieldname, file, filename) {
    const saveTo = `${this.downloadsFolder}/${filename}`;

    await pipeline(
      file, // readablestream
      this.handleFileBytes.apply(this, [filename]), // data process
      fs.createWriteStream(saveTo) // end of process
    );

    logger.info(`File [${filename}] finished!`);
  }

  registerEvents(headers, onFinish) {
    const busboy = new Busboy({ headers });

    busboy.on("file", this.onFile.bind(this));
    busboy.on("finish", onFinish);

    return busboy;
  }
}
