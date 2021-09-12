export default class ConnectionManager {
  constructor({ apiUrl }) {
    this.apiUrl = apiUrl;

    this.ioClient = io.connect(apiUrl, { withCredentials: false });
    this.socketId = "";
  }

  configureEvents({ onProgress }) {
    this.ioClient.on("connect", this.onConnect.bind(this));
    this.ioClient.on("file-upload", onProgress);
  }

  onConnect(msg) {
    this.socketId = this.ioClient.id;
  }

  async currentFiles() {
    try {
      const files = await (await fetch(this.apiUrl)).json();
      return files;
    } catch (e) {
      console.error(e.message);
      throw new Error("Something went wrong");
    }
  }

  async uploadFile(file) {
    const formData = new FormData();

    formData.append("files", file);

    try {
      const response = await fetch(`${this.apiUrl}?socketId=${this.socketId}`, {
        method: "POST",
        body: formData,
      });

      return response.json();
    } catch (error) {
      console.error(error);

      throw new Error("Something went wrong");
    }
  }
}
