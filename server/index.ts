import next, { NextApiHandler } from 'next';
import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import helmet from 'helmet';
import cors from 'cors';

import router from './routes';

const port: number = parseInt(process.env.PORT || '3333', 10);
const dev: boolean = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler: NextApiHandler = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  const app: Express = express();
  const server: http.Server = http.createServer(app);
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/hello', async (_: Request, res: Response) => {
    res.send('Hello World');
  });
  app.use('/', router);
  app.all('*', (req: any, res: any) => nextHandler(req, res));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
