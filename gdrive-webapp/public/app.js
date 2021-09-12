import AppController from "./src/appController.js";
import ConnectionManager from "./src/connectionManager.js";
import ViewManager from "./src/viewManager.js";

const API_URL = "https://localhost:3000";

const connectionManager = new ConnectionManager({
  apiUrl: API_URL,
});

const viewManager = new ViewManager();

const appController = new AppController({ connectionManager, viewManager });

try {
  await appController.initialize();
} catch (error) {
  console.error("error on initializing", error);
}
