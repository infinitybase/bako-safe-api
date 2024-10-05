import { Transaction } from '@src/models';
import { Router } from 'express';

const { AUTH_POINTS } = process.env;

const router = Router();

/**
 * @api {get} /query1
 *
 * header:
 *  - Authorization: hash fixa
 *
 * param {string} [data] - timestamp - UTC
 * param {string} [address] - account - b256()
 *
 */

router.get('/query1/:data/:address', (req, res) => {
  const { data, address } = req.params;
  const { authorization } = req.headers;

  if (authorization !== AUTH_POINTS) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  return new Promise((resolve, reject) => {
    Transaction.createQueryBuilder('t')
      .where('t.status = :status', { status: 'success' })
      .andWhere("(t.resume->>'totalSigners')::int = 1")
      .andWhere('t.created_at > :data', { data })
      .andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(t.resume->'witnesses') AS witness WHERE witness->>'account' = :address)",
        { address },
      )
      .getExists()
      .then(result => resolve(res.status(200).send({ valid: result })))
      .catch(err => reject(res.status(500).send({ message: err.message })));
  });
});

/**
 * @api {get} /query2
 *
 * header:
 *  - Authorization: fixed hash
 *
 * param {string} [data] - timestamp - UTC
 * param {string} [address] - account - b256()
 *
 */
router.get('/query2/:data/:address', (req, res) => {
  const { data, address } = req.params;
  const { authorization } = req.headers;

  if (authorization !== AUTH_POINTS) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  return new Promise((resolve, reject) => {
    Transaction.createQueryBuilder('t')
      .where('t.status = :status', { status: 'success' })
      .andWhere("(t.resume->>'totalSigners')::int > 1")
      .andWhere('t.created_at > :data', { data })
      .andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(t.resume->'witnesses') AS witness WHERE witness->>'account' = :address)",
        { address },
      )
      .getExists()
      .then(result => resolve(res.status(200).send({ valid: result })))
      .catch(err => reject(res.status(500).send({ message: err.message })));
  });
});
