import { Router } from 'express';

import addressRouter from './address';
import transactionRouter from './transactions';

const router = Router();

router.use('/address', addressRouter);
router.use('/transactions', transactionRouter);

export default router;
