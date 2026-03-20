import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const publicDir = path.resolve(__dirname, "..", "public");

app.use("/site", express.static(publicDir));
app.get("/site/*splat", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use("/assets", express.static(path.join(publicDir, "assets")));
app.use("/documents", express.static(path.join(publicDir, "documents")));
app.get("/favicon.png", (_req, res) => {
  res.sendFile(path.join(publicDir, "favicon.png"));
});
app.get("/hansen_photo.webp", (_req, res) => {
  res.sendFile(path.join(publicDir, "hansen_photo.webp"));
});
app.get("/opengraph.jpg", (_req, res) => {
  res.sendFile(path.join(publicDir, "opengraph.jpg"));
});

export default app;
