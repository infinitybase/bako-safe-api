import { Router } from 'express';
import * as pprof from 'pprof';

const router = Router();

router.get('/profile', async (_, res) => {
  try {
    const profile = await pprof.time.profile({
      durationMillis: 15000,
    });
    pprof.encode(profile)
      .then((buf) => res.send(buf))
      .catch((err) => res.send(err))
  } catch (e) {
    res.send('error profiling: ' + e)
  }
});

router.get('/heap', (_, res) => {
  const profile = pprof.heap.profile()
  pprof.encode(profile)
    .then((buf) => res.send(buf))
    .catch((err) => res.send(err))
});

export default router;
