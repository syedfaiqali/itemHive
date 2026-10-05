// Allocate a bundle's price to inventory products in whole paisa so POS can
// bill and deduct stock through its existing product flow.
export const allocateDealPrice = (price: number, weights: number[]): number[] => {
    if (!weights.length) return [];
    const cents = Math.round(price * 100);
    const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
    let allocated = 0;
    return weights.map((weight, index) => {
        const amount = index === weights.length - 1
            ? cents - allocated
            : Math.floor(cents * (totalWeight ? Math.max(0, weight) / totalWeight : 1 / weights.length));
        allocated += amount;
        return amount / 100;
    });
};
