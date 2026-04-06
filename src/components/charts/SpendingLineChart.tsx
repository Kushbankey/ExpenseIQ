"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/formatters";
import type { ExpenseTransaction } from "@/lib/types";

export function SpendingLineChart({
    expenses,
}: {
    expenses: ExpenseTransaction[];
}) {
    // Get current and previous month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(
        prevDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const currentExpenses = expenses.filter((t) => t.month === currentMonth);
    const prevExpenses = expenses.filter((t) => t.month === prevMonth);

    // Build cumulative daily totals
    const buildCumulative = (txns: ExpenseTransaction[]) => {
        const daily = new Map<number, number>();
        for (const t of txns) {
            const day = t.date.getDate();
            daily.set(day, (daily.get(day) || 0) + t.amount);
        }
        let cumulative = 0;
        const result: Record<number, number> = {};
        for (let d = 1; d <= 31; d++) {
            cumulative += daily.get(d) || 0;
            if (cumulative > 0) result[d] = cumulative;
        }
        return result;
    };

    const currentCum = buildCumulative(currentExpenses);
    const prevCum = buildCumulative(prevExpenses);
    const maxDay = Math.max(
        ...Object.keys(currentCum).map(Number),
        ...Object.keys(prevCum).map(Number),
        1
    );

    const chartData = Array.from({ length: maxDay }, (_, i) => ({
        day: i + 1,
        current: currentCum[i + 1] || null,
        previous: prevCum[i + 1] || null,
    }));

    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    return (
        <ResponsiveContainer width="100%" height={340}>
            <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Legend />
                <Line
                    dataKey="current"
                    name={months[now.getMonth()]}
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                />
                <Line
                    dataKey="previous"
                    name={months[prevDate.getMonth()]}
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
