"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Card } from "@/components/ui/Card";
import { CategoryDonutChart } from "@/components/charts/CategoryPieChart";
import { CategoryMonthlyTrend } from "@/components/charts/CategoryMonthlyTrend";
import { formatINR } from "@/lib/formatters";
import { CATEGORY_COLORS } from "@/lib/constants";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function CategoriesPage() {
    const data = useFinanceStore((s) => s.data);
    const [expanded, setExpanded] = useState<string | null>(null);

    const topCategories = useMemo(() => {
        if (!data) return [];
        return data.categoryAnalysis.slice(0, 5).map((c) => c.category);
    }, [data]);

    if (!data) return null;

    const toggle = (cat: string) => setExpanded(expanded === cat ? null : cat);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Spending breakdown by category and subcategory
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut Chart */}
                <Card title="Distribution">
                    <CategoryDonutChart categories={data.categoryAnalysis} />
                </Card>

                {/* Category List */}
                <Card title="Breakdown">
                    <div className="space-y-1 max-h-[390px] overflow-y-auto">
                        {data.categoryAnalysis.map((cat) => {
                            const isExpanded = expanded === cat.category;
                            const subcats = data.subcategoryAnalysis.filter(
                                (s) => s.category === cat.category
                            );
                            const color =
                                CATEGORY_COLORS[cat.category] || "#6b7280";
                            const totalPct = (
                                (cat.total / data.summary.totalExpense) *
                                100
                            ).toFixed(1);

                            return (
                                <div key={cat.category}>
                                    <button
                                        onClick={() => toggle(cat.category)}
                                        className="w-full flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2 h-8 rounded-full"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            />
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {cat.category}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {cat.count} transactions
                                                    &middot;{" "}
                                                    {formatINR(cat.monthlyAvg)}
                                                    /mo
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {formatINR(cat.total)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {totalPct}%
                                                </p>
                                            </div>
                                            {subcats.length > 1 &&
                                                (isExpanded ? (
                                                    <ChevronDown
                                                        size={16}
                                                        className="text-gray-400"
                                                    />
                                                ) : (
                                                    <ChevronRight
                                                        size={16}
                                                        className="text-gray-400"
                                                    />
                                                ))}
                                        </div>
                                    </button>

                                    {isExpanded && subcats.length > 1 && (
                                        <div className="ml-8 mb-2 space-y-1">
                                            {subcats.map((sub) => (
                                                <div
                                                    key={sub.subcategory}
                                                    className="flex items-center justify-between py-1.5 px-2 text-sm"
                                                >
                                                    <span className="text-gray-600">
                                                        {sub.subcategory}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400">
                                                            {sub.count} txns
                                                        </span>
                                                        <span className="font-medium text-gray-800">
                                                            {formatINR(
                                                                sub.total
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Monthly Spending by Category */}
            <Card title="Monthly Spending — Top 5 Categories">
                <CategoryMonthlyTrend
                    expenses={data.expenses}
                    topCategories={topCategories}
                />
            </Card>
        </div>
    );
}
