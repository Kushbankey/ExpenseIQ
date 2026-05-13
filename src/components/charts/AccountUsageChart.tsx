"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/formatters";
import type { AccountData } from "@/lib/types";

export function AccountUsageChart({ data }: { data: AccountData[] }) {
    const chartData = [...data].reverse();

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                    type="category"
                    dataKey="account"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    width={180}
                    tickFormatter={(v: string) =>
                        v.length > 22 ? v.slice(0, 20) + "…" : v
                    }
                />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Bar
                    dataKey="totalSpent"
                    name="Total Spent"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
