import {
  describe,
  test,
  expect,
  jest,
  beforeAll,
  afterAll,
} from "@jest/globals";

import FileHelper from "../../src/fileHelper.js";
import Routes from "../../src/routes.js";
import FormData from "form-data";
import TestUtil from "../_util/testUtil.js";

import { logger } from "../../src/logger.js";
import fs from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("#Routes integration test", () => {
  let defaultDownloadsFolder = "";

  const ioObj = {
    to: (id) => ioObj,
    emit: (event, message) => {},
  };

  beforeAll(async () => {
    defaultDownloadsFolder = await fs.promises.mkdtemp(
      join(tmpdir(), "downloads-")
    );
  });

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  afterAll(async () => {
    await fs.promises.rm(defaultDownloadsFolder, { recursive: true });
  });

  test("should upload file to the folder", async () => {
    const filename = "demo.gif";
    const fileStream = fs.createReadStream(
      `./test/integration/mocks/${filename}`
    );

    const response = TestUtil.generateWritableStream(() => {});

    const form = new FormData();
    form.append("photo", fileStream);

    const defaultParams = {
      request: Object.assign(form, {
        headers: form.getHeaders(),
        method: "POST",
        url: "?socketId=10",
      }),
      response: Object.assign(response, {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
      }),
      values: () => Object.values(defaultParams),
    };

    const routes = new Routes(defaultDownloadsFolder);

    routes.setSocketInstance(ioObj);

    const dirBeforeRan = await fs.promises.readdir(defaultDownloadsFolder);
    expect(dirBeforeRan).toEqual([]);

    await routes.handler(...defaultParams.values());

    const dirAfterRan = await fs.promises.readdir(defaultDownloadsFolder);
    expect(dirAfterRan).toEqual([filename]);

    expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200);
    const expectedEndResult = JSON.stringify({
      result: "Files uploaded with success!",
    });
    expect(defaultParams.response.end).toHaveBeenCalledWith(expectedEndResult);
  });
});
