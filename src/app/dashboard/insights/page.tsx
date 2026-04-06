"use client";

import { useFinanceStore } from "@/store/useFinanceStore";
import { Card } from "@/components/ui/Card";
import { formatINR, formatDate, formatMonth } from "@/lib/formatters";
import {
    UtensilsCrossed,
    Bus,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    Split,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    BarChart3,
    PiggyBank,
} from "lucide-react";

export default function InsightsPage() {
    const data = useFinanceStore((s) => s.data);
    if (!data) return null;

    const { insights } = data;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Smart analysis of your spending patterns
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Categories */}
                <Card title="Top Spending Categories">
                    <div className="space-y-3">
                        {insights.topCategories.map((cat, i) => (
                            <div
                                key={cat.category}
                                className="flex items-center justify-between py-2"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-gray-300">
                                        #{i + 1}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            {cat.category}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {cat.count} txns &middot;{" "}
                                            {formatINR(cat.monthlyAvg)}/mo
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatINR(cat.total)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Largest Transactions (Top 3) */}
                <Card title="Largest Transactions">
                    <div className="space-y-2">
                        {insights.largestTransactions.map((txn, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className="text-lg font-bold text-gray-300">
                                        #{i + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {txn.note || txn.subcategory}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {txn.category} &middot;{" "}
                                            {formatDate(txn.date)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-red-600 flex-shrink-0 ml-2">
                                    {formatINR(txn.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Food Breakdown */}
                <Card title="Food Breakdown">
                    <div className="flex items-center gap-2 mb-4">
                        <UtensilsCrossed
                            size={16}
                            className="text-orange-500"
                        />
                        <span className="text-sm text-gray-500">
                            Total:{" "}
                            {formatINR(
                                insights.foodBreakdown.reduce(
                                    (s, f) => s + f.total,
                                    0
                                )
                            )}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {insights.foodBreakdown.map((item) => {
                            const maxTotal =
                                insights.foodBreakdown[0]?.total || 1;
                            return (
                                <div key={item.subcategory}>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="text-gray-700">
                                            {item.subcategory}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatINR(item.total)}{" "}
                                            <span className="text-gray-400 text-xs">
                                                ({item.count})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full">
                                        <div
                                            className="h-full bg-orange-400 rounded-full"
                                            style={{
                                                width: `${
                                                    (item.total / maxTotal) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Transport Breakdown */}
                <Card title="Transport Analysis">
                    <div className="flex items-center gap-2 mb-4">
                        <Bus size={16} className="text-blue-500" />
                        <span className="text-sm text-gray-500">
                            Total:{" "}
                            {formatINR(
                                insights.transportBreakdown.reduce(
                                    (s, t) => s + t.total,
                                    0
                                )
                            )}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {insights.transportBreakdown.map((item) => {
                            const maxTotal =
                                insights.transportBreakdown[0]?.total || 1;
                            return (
                                <div key={item.subcategory}>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <div>
                                            <span className="text-gray-700">
                                                {item.subcategory}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">
                                                {item.count} trips · avg{" "}
                                                {formatINR(item.avg)}
                                            </span>
                                        </div>
                                        <span className="font-medium text-gray-900">
                                            {formatINR(item.total)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full">
                                        <div
                                            className="h-full bg-blue-400 rounded-full"
                                            style={{
                                                width: `${
                                                    (item.total / maxTotal) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Quick Commerce */}
                {insights.quickCommerce && (
                    <Card title="Quick Commerce (Impulse Orders)">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart
                                size={16}
                                className="text-amber-500"
                            />
                            <span className="text-sm text-gray-500">
                                Convenience delivery spending
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-amber-50 rounded-xl p-3">
                                <p className="text-xs text-amber-600 font-medium">
                                    Total Spent
                                </p>
                                <p className="text-lg font-bold text-amber-700">
                                    {formatINR(insights.quickCommerce.total)}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3">
                                <p className="text-xs text-amber-600 font-medium">
                                    Orders
                                </p>
                                <p className="text-lg font-bold text-amber-700">
                                    {insights.quickCommerce.count}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3">
                                <p className="text-xs text-amber-600 font-medium">
                                    Avg Order
                                </p>
                                <p className="text-lg font-bold text-amber-700">
                                    {formatINR(insights.quickCommerce.avg)}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3">
                                <p className="text-xs text-amber-600 font-medium">
                                    Monthly Avg
                                </p>
                                <p className="text-lg font-bold text-amber-700">
                                    {formatINR(
                                        insights.quickCommerce.monthlyAvg
                                    )}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Split Tracking */}
                {insights.splitTracking && (
                    <Card title="Split Expenses">
                        <div className="flex items-center gap-2 mb-4">
                            <Split size={16} className="text-violet-500" />
                            <span className="text-sm text-gray-500">
                                Shared expenses tracking
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <ArrowUp
                                        size={14}
                                        className="text-red-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-red-700">
                                            Paid by you
                                        </p>
                                        <p className="text-xs text-red-400">
                                            {insights.splitTracking.paidCount}{" "}
                                            transactions
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-red-600">
                                    {formatINR(
                                        insights.splitTracking.paidTotal
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <ArrowDown
                                        size={14}
                                        className="text-green-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-green-700">
                                            Received back
                                        </p>
                                        <p className="text-xs text-green-400">
                                            {
                                                insights.splitTracking
                                                    .receivedCount
                                            }{" "}
                                            transactions
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                    {formatINR(
                                        insights.splitTracking.receivedTotal
                                    )}
                                </span>
                            </div>
                            {insights.splitTracking.uncollected > 0 && (
                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle
                                            size={14}
                                            className="text-amber-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-amber-700">
                                                Potential uncollected
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-amber-700">
                                        {formatINR(
                                            insights.splitTracking.uncollected
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Investment Pattern */}
                {insights.investmentPattern && (
                    <Card title="Investment Consistency">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp
                                size={16}
                                className="text-emerald-500"
                            />
                            <span className="text-sm text-gray-500">
                                Active {insights.investmentPattern.monthsActive}{" "}
                                of {insights.investmentPattern.totalMonths}{" "}
                                months (
                                {(
                                    (insights.investmentPattern.monthsActive /
                                        insights.investmentPattern
                                            .totalMonths) *
                                    100
                                ).toFixed(0)}
                                %)
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 rounded-xl p-3">
                                <p className="text-xs text-emerald-600 font-medium">
                                    Total Invested
                                </p>
                                <p className="text-lg font-bold text-emerald-700">
                                    {formatINR(
                                        insights.investmentPattern.total
                                    )}
                                </p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-3">
                                <p className="text-xs text-emerald-600 font-medium">
                                    Monthly Avg
                                </p>
                                <p className="text-lg font-bold text-emerald-700">
                                    {formatINR(
                                        insights.investmentPattern.monthlyAvg
                                    )}
                                </p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-3">
                                <p className="text-xs text-emerald-600 font-medium">
                                    Min Month
                                </p>
                                <p className="text-lg font-bold text-emerald-700">
                                    {formatINR(insights.investmentPattern.min)}
                                </p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-3">
                                <p className="text-xs text-emerald-600 font-medium">
                                    Max Month
                                </p>
                                <p className="text-lg font-bold text-emerald-700">
                                    {formatINR(insights.investmentPattern.max)}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Spending Extremes */}
                {insights.spendingExtremes && (
                    <Card title="Monthly Extremes">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-500">
                                Highest vs lowest spending months
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <ArrowUp
                                        size={14}
                                        className="text-red-500"
                                    />
                                    <div>
                                        <p className="text-xs text-red-500 font-medium">
                                            Highest Month
                                        </p>
                                        <p className="text-sm font-semibold text-red-700">
                                            {formatMonth(
                                                insights.spendingExtremes
                                                    .highest.month
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-red-600">
                                    {formatINR(
                                        insights.spendingExtremes.highest.amount
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <ArrowDown
                                        size={14}
                                        className="text-green-500"
                                    />
                                    <div>
                                        <p className="text-xs text-green-500 font-medium">
                                            Lowest Month
                                        </p>
                                        <p className="text-sm font-semibold text-green-700">
                                            {formatMonth(
                                                insights.spendingExtremes.lowest
                                                    .month
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-green-600">
                                    {formatINR(
                                        insights.spendingExtremes.lowest.amount
                                    )}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Savings Rate Trend */}
                {insights.savingsRateTrend && (
                    <Card title="Savings Rate Trend">
                        <div className="flex items-center gap-2 mb-4">
                            <PiggyBank size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-500">
                                First 3 months vs last 3 months
                            </span>
                        </div>
                        <div
                            className={`p-4 rounded-xl ${
                                insights.savingsRateTrend.trend === "improving"
                                    ? "bg-green-50"
                                    : "bg-red-50"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {insights.savingsRateTrend.trend ===
                                "improving" ? (
                                    <TrendingUp
                                        size={20}
                                        className="text-green-600"
                                    />
                                ) : (
                                    <TrendingDown
                                        size={20}
                                        className="text-red-600"
                                    />
                                )}
                                <p
                                    className={`text-lg font-bold ${
                                        insights.savingsRateTrend.trend ===
                                        "improving"
                                            ? "text-green-700"
                                            : "text-red-700"
                                    }`}
                                >
                                    {insights.savingsRateTrend.trend ===
                                    "improving"
                                        ? "Improving"
                                        : "Declining"}
                                </p>
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        First 3 months avg
                                    </span>
                                    <span className="font-medium">
                                        {insights.savingsRateTrend.first3Avg.toFixed(
                                            1
                                        )}
                                        %
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Last 3 months avg
                                    </span>
                                    <span className="font-medium">
                                        {insights.savingsRateTrend.last3Avg.toFixed(
                                            1
                                        )}
                                        %
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
