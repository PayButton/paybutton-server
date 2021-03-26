import { Router } from 'express';

import addressRouter from './address';

const router = Router();

router.use('/address', addressRouter);

export default router;
