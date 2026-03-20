import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
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

// Inject a path-fix script into index.html so the protected site's React Router
// sees "/" instead of "/site/" when the page first loads.
const PATH_FIX_SCRIPT = `<script>
  (function(){
    var p = window.location.pathname.replace(/^\\/site/, '') || '/';
    if (window.location.pathname !== p) history.replaceState(null, '', p + window.location.search + window.location.hash);
  })();
</script>`;

function serveSiteIndex(_req: express.Request, res: express.Response): void {
  const indexPath = path.join(publicDir, "index.html");
  const html = fs.readFileSync(indexPath, "utf-8");
  const patched = html.replace("<head>", `<head>${PATH_FIX_SCRIPT}`);
  res.setHeader("Content-Type", "text/html");
  res.send(patched);
}

// Serve the patched index.html for the root of the site and any SPA deep links
app.get("/site", serveSiteIndex);
app.get("/site/", serveSiteIndex);

// Serve all other static assets under /site (CSS, JS, images, etc.) — index: false
// so index.html is never served raw from this middleware
app.use("/site", express.static(publicDir, { index: false }));

// SPA catch-all: any /site/* path that isn't a file gets the patched index.html
app.get("/site/*splat", serveSiteIndex);

// Root-path aliases the protected site's absolute asset links need
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
