import { describe, test, expect, jest } from "@jest/globals";

import fs from "fs";

import FileHelper from "../../src/fileHelper.js";

describe("FileHelper", () => {
  describe("getFileStatus", () => {
    test("should return files statuses in correct format", async () => {
      const statMock = {
        dev: 16777223,
        mode: 33188,
        nlink: 1,
        uid: 501,
        gid: 20,
        rdev: 0,
        blksize: 4096,
        ino: 10648309,
        size: 1195211,
        blocks: 2336,
        atimeMs: 1631156127983.1584,
        mtimeMs: 1631156126922.1511,
        ctimeMs: 1631156126927.964,
        birthtimeMs: 1631156126914.8872,
        atime: "2021-09-09T02:55:27.983Z",
        mtime: "2021-09-09T02:55:26.922Z",
        ctime: "2021-09-09T02:55:26.928Z",
        birthtime: "2021-09-09T02:55:26.915Z",
      };

      const mockUser = "wesleyarizio";
      process.env.USER = mockUser;
      const fileName = "demo.gif";

      jest
        .spyOn(fs.promises, fs.promises.readdir.name)
        .mockResolvedValue([fileName]);

      jest
        .spyOn(fs.promises, fs.promises.stat.name)
        .mockResolvedValue(statMock);

      const expectedResult = [
        {
          size: "1.2 MB",
          lastModified: statMock.birthtime,
          owner: mockUser,
          file: fileName,
        },
      ];

      const result = await FileHelper.getFileStatus("/tmp");

      expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${fileName}`);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
