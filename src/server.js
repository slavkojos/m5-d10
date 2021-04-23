import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mediaRoute from "./services/media.js";
import reviewsRoute from "./services/reviews.js";
import listEndpoints from "express-list-endpoints";
import { badRequestErrorHandler, notFoundErrorHandler, forbiddenErrorHandler, catchAllErrorHandler } from "./errorHandling.js";

const currentWorkingFile = fileURLToPath(import.meta.url);
const currentWorkingDirectory = dirname(currentWorkingFile);

const publicFolderDirectory = join(currentWorkingDirectory, "../public");

const app = express();

app.use(cors());

app.use(express.static(publicFolderDirectory));

app.use(express.json());

app.use("/media", mediaRoute);
app.use("/reviews", reviewsRoute);

app.use(badRequestErrorHandler);
app.use(notFoundErrorHandler);
app.use(forbiddenErrorHandler);
app.use(catchAllErrorHandler);

const PORT = process.env.PORT || 5000;
console.log(listEndpoints(app));
app.listen(PORT, () => console.log("🚀 Server is running on port ", PORT));

app.on("error", (error) => console.log("🚀 Server is not running due to ", error));
