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
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                    type="category"
                    dataKey="account"
                    tick={{ fontSize: 10 }}
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
