"use client";

import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { InsightData } from "@/lib/types";

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function InvestmentTracker({
    data,
}: {
    data: InsightData["investmentPattern"];
}) {
    if (!data) return null;

    const doneCount = data.sips.filter((s) => s.doneThisMonth).length;
    const pendingCount = data.sips.filter((s) => !s.doneThisMonth).length;

    return (
        <div className="space-y-3">
            {/* This month status */}
            <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 size={12} /> {doneCount} done this month
                </span>
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock size={12} /> {pendingCount} pending
                    </span>
                )}
            </div>

            {/* SIP list */}
            <div className="space-y-1 max-h-[400px] overflow-y-auto box-border">
                {data.sips.map((sip) => (
                    <div
                        key={`${sip.name}-${sip.amount}`}
                        className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {sip.doneThisMonth ? (
                                <CheckCircle2
                                    size={15}
                                    className="text-green-500 flex-shrink-0"
                                />
                            ) : (
                                <Clock
                                    size={15}
                                    className="text-amber-400 flex-shrink-0"
                                />
                            )}
                            <div className="min-w-0">
                                <p className="text-sm text-gray-800 truncate">
                                    {sip.name}
                                </p>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar size={10} />~
                                    {ordinal(sip.typicalDay)} &middot;{" "}
                                    {sip.monthsActive}mo active
                                </p>
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">
                            {formatINR(sip.amount)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
