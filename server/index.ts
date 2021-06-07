import next, { NextApiHandler } from "next";
import express, { Express, Request, Response } from "express";
import * as http from "http";
import helmet from "helmet";
import cors from "cors";
import supertokens from "supertokens-node";
import { backendConfig } from "../config/supertokensConfig";
supertokens.init(backendConfig());
import router from "./routes";

const port: number = parseInt(process.env.PORT || "3000", 10);
const dev: boolean = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler: NextApiHandler = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  const app: Express = express();
  const server: http.Server = http.createServer(app);
  app.use(
    cors({
      origin: "http://localhost:3000",
      allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
      credentials: true,
    })
  );

  app.use(supertokens.middleware());
  app.use(helmet());

  app.use(express.json());

  app.get("/hello", async (_: Request, res: Response) => {
    res.send("Hello World");
  });
  app.use("/", router);
  app.all("*", (req: any, res: any) => nextHandler(req, res));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
