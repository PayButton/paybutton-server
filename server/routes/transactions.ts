import { Router, Request, Response } from 'express';
import { getTransactionDetails } from '../utils/bchd';

const transactionRouter = Router();

transactionRouter.get('/details/:txid', async (req: Request, res: Response) => {
  const { txid } = req.params;

  if (!txid) {
    res.send({ message: 'Missing txid parameter' });
  }

  try {
    const response = await getTransactionDetails(txid);
    res.status(200).send(response);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

export default transactionRouter;
