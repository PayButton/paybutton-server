import { Router } from 'express';

import addressRouter from './address';

const router = Router();

router.use('/api/address', addressRouter);

export default router;
