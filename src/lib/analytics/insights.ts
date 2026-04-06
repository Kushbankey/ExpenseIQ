import type {
    ExpenseTransaction,
    Transaction,
    CategoryTotal,
    MonthlyTrend,
    InsightData,
    SipInfo,
} from "../types";

export function generateInsights(
    expenses: ExpenseTransaction[],
    income: Transaction[],
    categories: CategoryTotal[],
    monthlyTrends: MonthlyTrend[],
    numMonths: number
): InsightData {
    // Top 3 spending categories
    const topCategories = categories.slice(0, 3).map((c) => ({
        category: c.category,
        total: c.total,
        monthlyAvg: c.monthlyAvg,
        count: c.count,
    }));

    // Top 3 largest transactions
    const largestTransactions = [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    // Food breakdown
    const foodExpenses = expenses.filter((t) => t.category === "🍜 Food");
    const foodSubMap = new Map<string, { total: number; count: number }>();
    for (const t of foodExpenses) {
        const entry = foodSubMap.get(t.subcategory) || { total: 0, count: 0 };
        entry.total += t.amount;
        entry.count += 1;
        foodSubMap.set(t.subcategory, entry);
    }
    const foodBreakdown = [...foodSubMap.entries()]
        .map(([subcategory, { total, count }]) => ({
            subcategory,
            total,
            count,
        }))
        .sort((a, b) => b.total - a.total);

    // Quick commerce
    const qc = expenses.filter((t) => t.subcategory === "Quick commerce");
    const quickCommerce =
        qc.length > 0
            ? {
                  count: qc.length,
                  total: qc.reduce((s, t) => s + t.amount, 0),
                  avg: qc.reduce((s, t) => s + t.amount, 0) / qc.length,
                  monthlyAvg: qc.reduce((s, t) => s + t.amount, 0) / numMonths,
              }
            : null;

    // Transport breakdown
    const transport = expenses.filter((t) => t.category === "🚖 Transport");
    const transSubMap = new Map<string, { total: number; count: number }>();
    for (const t of transport) {
        const entry = transSubMap.get(t.subcategory) || { total: 0, count: 0 };
        entry.total += t.amount;
        entry.count += 1;
        transSubMap.set(t.subcategory, entry);
    }
    const transportBreakdown = [...transSubMap.entries()]
        .map(([subcategory, { total, count }]) => ({
            subcategory,
            total,
            count,
            avg: total / count,
        }))
        .sort((a, b) => b.total - a.total);

    // Investment pattern + SIP details
    const inv = expenses.filter((t) => t.classification === "Investment");
    let investmentPattern = null;
    if (inv.length > 0) {
        const invMonthMap = new Map<string, number>();
        for (const t of inv) {
            invMonthMap.set(
                t.month,
                (invMonthMap.get(t.month) || 0) + t.amount
            );
        }
        const monthlyAmounts = [...invMonthMap.values()];

        // Build SIP list — group investments by note, track months and day-of-month
        const sipMap = new Map<
            string,
            { months: Map<string, number>; amounts: number[] }
        >();
        for (const t of inv) {
            if (!t.note) continue;
            let entry = sipMap.get(t.note);
            if (!entry) {
                entry = { months: new Map(), amounts: [] };
                sipMap.set(t.note, entry);
            }
            entry.months.set(t.month, t.date.getDate());
            entry.amounts.push(t.amount);
        }

        // Determine current month and recent months from latest transactions
        const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
        const currentMonth = allMonths[allMonths.length - 1];
        const recentMonths = new Set(allMonths.slice(-2));

        const sips: SipInfo[] = [...sipMap.entries()]
            .filter(([, info]) => {
                if (info.months.size < 3) return false;
                // Must be roughly 1 per month
                const ratio = info.amounts.length / info.months.size;
                if (ratio > 1.3) return false;
                // Day-of-month must be consistent (within 7-day window)
                const days = [...info.months.values()];
                const minDay = Math.min(...days);
                const maxDay = Math.max(...days);
                if (maxDay - minDay > 7) return false;
                // Must be active recently — present in at least one of the last 2 months
                const sipMonths = [...info.months.keys()];
                return sipMonths.some((m) => recentMonths.has(m));
            })
            .map(([name, info]) => {
                const days = [...info.months.values()].sort((a, b) => a - b);
                const typicalDay = days[Math.floor(days.length / 2)];
                return {
                    name,
                    amount: info.amounts[info.amounts.length - 1],
                    monthsActive: info.months.size,
                    doneThisMonth: info.months.has(currentMonth),
                    lastMonth: [...info.months.keys()].sort().pop() || "",
                    typicalDay,
                };
            })
            .sort((a, b) => b.monthsActive - a.monthsActive);

        investmentPattern = {
            total: inv.reduce((s, t) => s + t.amount, 0),
            monthlyAvg:
                monthlyAmounts.reduce((s, v) => s + v, 0) /
                monthlyAmounts.length,
            min: Math.min(...monthlyAmounts),
            max: Math.max(...monthlyAmounts),
            monthsActive: monthlyAmounts.length,
            totalMonths: numMonths,
            sips,
        };
    }

    // Split tracking
    const splitExp = expenses.filter((t) => t.description === "Split");
    const splitInc = income.filter((t) => t.category === "Split");
    const splitPaidTotal = splitExp.reduce((s, t) => s + t.amount, 0);
    const splitReceivedTotal = splitInc.reduce((s, t) => s + t.amount, 0);
    const splitTracking =
        splitExp.length > 0 || splitInc.length > 0
            ? {
                  paidTotal: splitPaidTotal,
                  paidCount: splitExp.length,
                  receivedTotal: splitReceivedTotal,
                  receivedCount: splitInc.length,
                  uncollected: Math.max(0, splitPaidTotal - splitReceivedTotal),
              }
            : null;

    // Spending extremes
    let spendingExtremes = null;
    if (monthlyTrends.length > 0) {
        const highest = monthlyTrends.reduce(
            (max, t) => (t.expense > max.expense ? t : max),
            monthlyTrends[0]
        );
        const lowest = monthlyTrends.reduce(
            (min, t) => (t.expense < min.expense ? t : min),
            monthlyTrends[0]
        );
        spendingExtremes = {
            highest: { month: highest.month, amount: highest.expense },
            lowest: { month: lowest.month, amount: lowest.expense },
        };
    }

    // Savings rate trend (exclude partial months with <₹10K income)
    let savingsRateTrend = null;
    const fullMonths = monthlyTrends.filter((t) => t.income > 10000);
    if (fullMonths.length >= 6) {
        const first3 = fullMonths.slice(0, 3);
        const last3 = fullMonths.slice(-3);
        const first3Avg = first3.reduce((s, t) => s + t.savingsRate, 0) / 3;
        const last3Avg = last3.reduce((s, t) => s + t.savingsRate, 0) / 3;
        savingsRateTrend = {
            first3Avg,
            last3Avg,
            trend:
                last3Avg > first3Avg
                    ? ("improving" as const)
                    : ("declining" as const),
        };
    }

    return {
        topCategories,
        largestTransactions,
        foodBreakdown,
        quickCommerce,
        transportBreakdown,
        investmentPattern,
        splitTracking,
        spendingExtremes,
        savingsRateTrend,
    };
}
