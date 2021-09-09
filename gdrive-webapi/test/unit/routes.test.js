import { describe, test, expect, jest } from "@jest/globals";
import Routes from "../../src/routes.js";

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
});