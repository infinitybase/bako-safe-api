import { Predicate } from '@src/models/Predicate';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IPredicateService } from '../predicate/types';
import { ICreateDappRequest, IDAppsService } from './types';

export class DappController {
  private service: IDAppsService;
  private predicateService: IPredicateService;

  constructor(service: IDAppsService, predicateService: IPredicateService) {
    this.service = service;
    this.predicateService = predicateService;
    bindMethods(this);
  }

  async create({ body, params, socketServer }: ICreateDappRequest) {
    try {
      console.log('[create]: ', body, params, socketServer);

      const { sessionId } = params;
      const { origin, vaultId } = body;
      const predicate = await this.predicateService.findById(vaultId);

      await this.service.create({
        sessionId,
        name: 'name',
        origin,
        vaults: [predicate],
      });

      socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'connection',
        data: [true],
      });
      socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'accounts',
        data: [[predicate.predicateAddress]],
      });
      socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'currentAccount',
        data: [predicate.predicateAddress],
      });

      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  //   async findByAddress({ params: { address } }: IFindByHashRequest) {
  //     try {
  //       const response = await this.predicateService
  //         .filter({
  //           address,
  //         })
  //         .list()
  //         .then((data: Predicate[]) => data[0]);

  //       return successful(response, Responses.Ok);
  //     } catch (e) {
  //       return error(e.error, e.statusCode);
  //     }
  //   }

  //   async list(req: IListRequest) {
  //     const { provider, owner, orderBy, sort, page, perPage, q } = req.query;
  //     const { address } = req.user;

  //     try {
  //       const response = await this.predicateService
  //         .filter({ address, signer: address, provider, owner, q })
  //         .ordination({ orderBy, sort })
  //         .paginate({ page, perPage })
  //         .list();

  //       return successful(response, Responses.Ok);
  //     } catch (e) {
  //       return error(e.error, e.statusCode);
  //     }
  //   }
}

// router.get('/connections/:uuid/accounts', (req, res) => {
//   try {
//     const sessionId = req.params.uuid;
//     const origin = req.header('origin') || req.header('Origin');

//     console.log(connections);

//     if (!connections[`${sessionId}:${origin}`]) {
//       return res.status(400).send({
//         message: 'Not authorized for connection',
//       });
//     }

//     res.send({
//       data: connections[`${sessionId}:${origin}`].accounts,
//     });
//   } catch (e) {
//     console.log(e);
//   }
// });

// router.get('/connections/:uuid/currentAccount', (req, res) => {
//   const sessionId = req.params.uuid;
//   const origin = req.header('origin') || req.header('Origin');

//   if (!connections[`${sessionId}:${origin}`]) {
//     return res.status(400).send({
//       message: 'Not authorized for connection',
//     });
//   }

//   res.send({
//     data: connections[`${sessionId}:${origin}`].accounts[0],
//   });
// });

// router.get('/connections/:uuid/state', (req, res) => {
//   const sessionId = req.params.uuid;
//   const origin = req.header('origin');
//   res.send({
//     data: !!connections[`${sessionId}:${origin}`],
//   });
// });

// // TODO:
// // - Add mid auth
// router.post('/connections/:uuid', async (req, res) => {});
