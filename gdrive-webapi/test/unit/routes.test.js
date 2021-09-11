import { describe, test, expect, jest } from "@jest/globals";
import Routes from "../../src/routes.js";
import UploadHandler from "../../src/uploadHandler.js";
import TestUtil from "../_util/testUtil.js";
import { logger } from "../../src/logger";

describe("Routes test suit", () => {
  const defaultParams = {
    request: {
      headers: {
        "Content-Type": "multipart/form-data", // for file upload
      },
      method: "",
      body: {},
    },
    response: {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    },

    values: () => Object.values(defaultParams),
  };

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  describe("setSocketInstance", () => {
    test("setSocket should store io instance", () => {
      const routes = new Routes();

      const ioObj = {
        to: (id) => ioObj,
        emit: (event, message) => {},
      };

      routes.setSocketInstance(ioObj);

      expect(routes.io).toStrictEqual(ioObj);
    });
  });

  describe("handler", () => {
    test("given an inexistent route it should choose default route", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "inexistent";

      await routes.handler(...params.values());

      expect(params.response.end).toHaveBeenCalledWith("Hey Dude!");
    });

    test("should set all required headers configuration", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "inexistent";

      await routes.handler(...params.values());

      expect(params.response.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*"
      );
    });

    test("given method OPTIONS it should chosose options route", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "OPTIONS";

      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(204);
      expect(params.response.end).toHaveBeenCalled();
    });

    test("given method POST it should choose post route", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "POST";

      jest.spyOn(routes, routes.post.name).mockResolvedValue();

      await routes.handler(...params.values());

      expect(routes.post).toHaveBeenCalled();
    });

    test("given method GET it should choose get route", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "GET";

      jest.spyOn(routes, routes.get.name).mockResolvedValue();

      await routes.handler(...params.values());

      expect(routes.get).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    test("given method GET it should list all files downloaded", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      const filesStatusesMock = [
        {
          size: "1.2 MB",
          lastModified: "2021-09-09T02:55:26.915Z",
          owner: "wesleyarizio",
          file: "demo.gif",
        },
      ];

      jest
        .spyOn(routes.fileHelper, routes.fileHelper.getFileStatus.name)
        .mockResolvedValue(filesStatusesMock);

      params.request.method = "GET";

      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(200);
      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify(filesStatusesMock)
      );
    });
  });

  describe("#post", () => {
    it("should validate post route workflow", async () => {
      const request = TestUtil.generateReadableStream(["some chunks here"]);
      const response = TestUtil.generateWritableStream(() => {});

      const defaultParams = {
        request: Object.assign(request, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
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

      const routes = new Routes("/tmp");

      jest
        .spyOn(
          UploadHandler.prototype,
          UploadHandler.prototype.registerEvents.name
        )
        .mockImplementation((headers, onFinish) => {
          const writable = TestUtil.generateWritableStream(() => {});
          writable.on("finish", onFinish);

          return writable;
        });

      await routes.handler(...defaultParams.values());

      expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled();
      expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200);

      const expectedEndResult = JSON.stringify({
        result: "Files uploaded with success!",
      });

      expect(defaultParams.response.end).toHaveBeenCalledWith(
        expectedEndResult
      );
    });
  });
});
