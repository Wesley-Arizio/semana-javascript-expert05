import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import UploadHandler from "../../src/uploadHandler.js";
import TestUtil from "../_util/testUtil.js";
import fs from "fs";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { logger } from "../../src/logger.js";

describe("#UploadHandler test suit", () => {
  const ioObj = {
    to: (id) => ioObj,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  describe("#registerEvents", () => {
    test("should call onFile and onFinish functions on BusboyInstance", () => {
      const uploadHandler = new UploadHandler({ io: ioObj, socketId: "0" });

      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

      const headers = {
        "content-type": "multipart/form-data; boundary=",
      };

      const onFinishMocked = jest.fn();

      const busboyInstance = uploadHandler.registerEvents(
        headers,
        onFinishMocked
      );

      const fileStream = TestUtil.generateReadableStream([
        "chunk",
        "of",
        "data",
      ]);

      busboyInstance.emit("file", "fieldname", fileStream, "filename.txt");

      busboyInstance.listeners("finish")[0].call(); // execute all onFinish listeners, in this case onFinishMocked

      expect(uploadHandler.onFile).toHaveBeenCalled();
      expect(onFinishMocked).toHaveBeenCalled();
    });
  });

  describe("#onFile", () => {
    test("given a stream file it should save it on disk", async () => {
      const chunks = ["Hey", "Dude"];
      const downloadsFolder = "/tmp";

      const handler = new UploadHandler({
        io: ioObj,
        socketId: "01",
        downloadsFolder,
      });

      const onData = jest.fn();

      jest
        .spyOn(fs, fs.createWriteStream.name)
        .mockImplementation(() => TestUtil.generateWritableStream(onData));

      const onTransform = jest.fn();

      jest
        .spyOn(handler, handler.handleFileBytes.name)
        .mockImplementation(() =>
          TestUtil.generateTransformStream(onTransform)
        );

      const params = {
        fieldname: "video",
        file: TestUtil.generateReadableStream(chunks),
        filename: "video.mov",
      };

      await handler.onFile(...Object.values(params));

      expect(onData.mock.calls.join()).toEqual(chunks.join());
      expect(onTransform.mock.calls.join()).toEqual(chunks.join());

      const expectedFilename = resolve(
        handler.downloadsFolder,
        params.filename
      );

      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename);
    });
  });

  describe("#handleFileBytes", () => {
    test("should call emit function and it is a transform stream", async () => {
      jest.spyOn(ioObj, ioObj.to.name);
      jest.spyOn(ioObj, ioObj.emit.name);

      const handler = new UploadHandler({
        io: ioObj,
        socketId: "01",
      });

      jest.spyOn(handler, handler.canExecute.name).mockReturnValueOnce(true);

      const messages = ["hello"];
      const source = TestUtil.generateReadableStream(messages);
      const onWrite = jest.fn();
      const target = TestUtil.generateWritableStream(onWrite);

      await pipeline(source, handler.handleFileBytes("filename.txt"), target);

      expect(ioObj.to).toHaveBeenCalledTimes(messages.length);
      expect(ioObj.emit).toHaveBeenCalledTimes(messages.length);

      // if handleFileBytes were a transform stream,
      // pipeline will keep the proccess passing data
      // and call our target function for each chunk

      expect(onWrite).toBeCalledTimes(messages.length);
      expect(onWrite.mock.calls.join()).toEqual(messages.join());
    });

    test("given message time delay as 2 secs it should emit only one message  during 2 seconds", async () => {
      jest.spyOn(ioObj, ioObj.emit.name);

      const day = "2021-07-01 01:01";
      const twoSecondsPeriod = 2000;

      // Date.now do this.lastMessageSent em handleBytes
      const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`);

      // -> hello chegou
      const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`);
      const onSecondUpdateLastMessageSent = onFirstCanExecute;

      // -> segundo hello, está fora da janela de tempo!
      const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`);

      // -> world
      const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`);

      TestUtil.mockDateNow([
        onFirstLastMessageSent,
        onFirstCanExecute,
        onSecondUpdateLastMessageSent,
        onSecondCanExecute,
        onThirdCanExecute,
      ]);

      const messages = ["hello", "hello", "world"];
      const filename = "filename.avi";
      const expectedMessageSent = 2;

      const source = TestUtil.generateReadableStream(messages);
      const handler = new UploadHandler({
        messageTimeDelay: twoSecondsPeriod,
        io: ioObj,
        socketId: "01",
      });

      await pipeline(source, handler.handleFileBytes(filename));

      expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent);

      const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls;

      expect(firstCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processAlready: "hello".length, filename },
      ]);
      expect(secondCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processAlready: messages.join("").length, filename },
      ]);
    });
  });

  describe("#canExecute", () => {
    test("should return true when time is later than specified delay", () => {
      const timerDelay = 1000;
      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });
      const tickNow = TestUtil.getTimeFromDate("2021-07-01 00:00:03");

      TestUtil.mockDateNow([tickNow]);

      const tickThreeSecondsBefore = TestUtil.getTimeFromDate(
        "2021-07-01 00:00:00"
      );

      const lastExecution = tickThreeSecondsBefore;

      const response = uploadHandler.canExecute(lastExecution);

      expect(response).toBeTruthy();
    });
    test("should return false when time is later than specified delay", () => {
      const timerDelay = 3000;
      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });
      const now = TestUtil.getTimeFromDate("2021-07-01 00:00:01");

      TestUtil.mockDateNow([now]);

      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:00");

      const response = uploadHandler.canExecute(lastExecution);

      expect(response).toBeFalsy();
    });
  });
});
