import { Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  async getTransactionsPagination(req: Request, res: Response) {
    try {
      const {
        predicateId,
        status,
        type,
        dateFrom,
        dateTo,
        page,
        perPage,
        orderBy,
        sort,
      } = req.query;

      // Validate required date fields
      if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
        return res.status(400).json({
          error: 'Ambos os campos de data são obrigatórios',
        });
      }

      // Validate date format and range
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom as string);
        const toDate = new Date(dateTo as string);
        
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return res.status(400).json({
            error: 'Formato de data inválido',
          });
        }
        
        if (fromDate > toDate) {
          return res.status(400).json({
            error: 'Data inicial deve ser anterior à data final',
          });
        }
        
        // Validate maximum 2 years interval
        const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
        if (toDate.getTime() - fromDate.getTime() > twoYearsInMs) {
          return res.status(400).json({
            error: 'Intervalo máximo de 2 anos permitido',
          });
        }
      }

      const result = await this.transactionService.getTransactionsPagination({
        predicateId: predicateId ? (Array.isArray(predicateId) ? predicateId : [predicateId]) as string[] : undefined,
        status: status ? (Array.isArray(status) ? status : [status]) as any[] : undefined,
        type: type as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: page ? parseInt(page as string) : undefined,
        perPage: perPage ? parseInt(perPage as string) : undefined,
        orderBy: orderBy as string,
        sort: sort as 'ASC' | 'DESC',
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}