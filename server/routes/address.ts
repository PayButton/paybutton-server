import { Router, Request, Response } from 'express';
import { getBCHBalance, getUtxos, getAddress } from '../utils/bchd';

const addressRouter = Router();

addressRouter.get('/balance/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.send({ message: 'Missing Address parameter' });
  }

  try {
    const response = await getBCHBalance(address);
    res.status(200).send({ satoshis: response });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

addressRouter.get('/utxo/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.send({ message: 'Missing Address parameter' });
  }

  try {
    const response = await getUtxos(address);
    res.status(200).send(response);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

addressRouter.get(
  '/transactions/:address',
  async (req: Request, res: Response) => {
    const { address } = req.params;

    if (!address) {
      res.send({ message: 'Missing Address parameter' });
    }

    try {
      const response = await getAddress(address);
      res.status(200).send(response);
    } catch (e) {
      res.status(500).send(e.message);
    }
  }
);

export default addressRouter;
