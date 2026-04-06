"use client";

import { formatINR, formatDateShort } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import type { ExpenseTransaction } from "@/lib/types";

export function RecentTransactions({
    transactions,
}: {
    transactions: ExpenseTransaction[];
}) {
    const recent = [...transactions]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 7);

    return (
        <div className="space-y-1">
            {recent.map((txn, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-base">
                            {txn.category.match(
                                /\p{Emoji_Presentation}/u
                            )?.[0] || "💳"}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {txn.note || txn.subcategory}
                            </p>
                            <p className="text-xs text-gray-400">
                                {txn.subcategory}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <Badge classification={txn.classification} />
                        <div className="text-right min-w-[80px]">
                            <p className="text-sm font-semibold text-red-500">
                                -{formatINR(txn.amount)}
                            </p>
                            <p className="text-xs text-gray-400">
                                {formatDateShort(txn.date)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
