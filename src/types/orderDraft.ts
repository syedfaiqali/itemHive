export interface OrderDraftItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface OrderDraft {
    _id: string;
    draftCode: string;
    items: OrderDraftItem[];
    discountPercent: number;
    orderType?: string;
    otherOrderType?: string;
    deliveryNumber?: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}
