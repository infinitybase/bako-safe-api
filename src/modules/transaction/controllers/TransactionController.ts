import { Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import { GetTransactionParams } from '../types';

export class TransactionController {
  static async getTransactionsPagination(req: Request, res: Response) {
    try {
      const {
        page,
        perPage,
        predicateId,
        status,
        type,
        orderBy,
        sort,
        dateFrom,
        dateTo,
      } = req.query as GetTransactionParams & {
        dateFrom?: string;
        dateTo?: string;
      };

      // Validate date parameters
      if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
        return res.status(400).json({
          error: 'Ambos os campos de data são obrigatórios',
        });
      }

      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return res.status(400).json({
            error: 'Formato de data inválido',
          });
        }

        if (fromDate >= toDate) {
          return res.status(400).json({
            error: 'Data inicial deve ser anterior à data final',
          });
        }

        const maxInterval = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
        if (toDate.getTime() - fromDate.getTime() > maxInterval) {
          return res.status(400).json({
            error: 'Intervalo máximo permitido é de 2 anos',
          });
        }
      }

      const result = await TransactionService.getTransactionsPagination({
        page: page ? parseInt(page as string) : undefined,
        perPage: perPage ? parseInt(perPage as string) : undefined,
        predicateId: predicateId ? (Array.isArray(predicateId) ? predicateId : [predicateId]) : undefined,
        status: status ? (Array.isArray(status) ? status : [status]) : undefined,
        type,
        orderBy,
        sort,
        dateFrom,
        dateTo,
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  static async getByHash(req: Request, res: Response) {
    try {
      const { hash } = req.params;
      const { status } = req.query;

      const transaction = await TransactionService.getByHash(
        hash,
        status ? (Array.isArray(status) ? status : [status]) : undefined
      );

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.json(transaction);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}