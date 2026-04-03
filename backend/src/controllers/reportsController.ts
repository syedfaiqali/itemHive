import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Product from '../models/Product';

export const getSalesTrend = async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const stats = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateLimit },
                    type: 'reduction'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    revenue: { $sum: '$totalPrice' },
                    sales: { $sum: '$amount' },
                    profit: { $sum: '$grossProfit' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCategoryValuation = async (req: Request, res: Response) => {
    try {
        const valuation = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    value: { $sum: { $multiply: ['$stock', '$price'] } }
                }
            },
            { $sort: { value: -1 } }
        ]);

        res.json(valuation.map(v => ({ name: v._id, value: v.value })));
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTopSellingProducts = async (req: Request, res: Response) => {
    try {
        const topSelling = await Transaction.aggregate([
            { $match: { type: 'reduction' } },
            {
                $group: {
                    _id: '$productId',
                    name: { $first: '$productName' },
                    totalReduced: { $sum: '$amount' },
                    revenue: { $sum: '$totalPrice' },
                    profit: { $sum: '$grossProfit' }
                }
            },
            { $sort: { totalReduced: -1 } },
            { $limit: 10 }
        ]);

        res.json(topSelling);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
