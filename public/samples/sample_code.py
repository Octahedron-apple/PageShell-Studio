"""
PageShell Studio — Sample Code Runner Demo
===========================================
This script demonstrates data analysis capabilities using the
built-in Python (Pyodide) sandbox. No internet required.

Run it via: Code tab > open sample_code.py > click Run
"""

import statistics

# ─── Sales data ─────────────────────────────────────────────────────────────
sales_data = {
    "Q1": [12400, 15300, 11800, 17600, 14200, 13500],
    "Q2": [18200, 21000, 19500, 22400, 20100, 23700],
    "Q3": [16800, 14900, 17300, 18500, 15600, 16200],
    "Q4": [25600, 28300, 27100, 29800, 31200, 30400],
}

print("=" * 50)
print("  PageShell Studio — Quarterly Sales Analysis")
print("=" * 50)

annual_total = 0

for quarter, values in sales_data.items():
    total     = sum(values)
    average   = statistics.mean(values)
    median    = statistics.median(values)
    std_dev   = statistics.stdev(values)
    annual_total += total

    print(f"\n📊 {quarter} Summary")
    print(f"   Total Revenue : ${total:,}")
    print(f"   Monthly Avg   : ${average:,.0f}")
    print(f"   Median        : ${median:,.0f}")
    print(f"   Std Deviation : ${std_dev:,.0f}")

print("\n" + "=" * 50)
print(f"  Annual Revenue Total: ${annual_total:,}")
print("=" * 50)

# ─── Growth rate ────────────────────────────────────────────────────────────
quarterly_totals = [sum(v) for v in sales_data.values()]
for i in range(1, len(quarterly_totals)):
    growth = ((quarterly_totals[i] - quarterly_totals[i - 1]) / quarterly_totals[i - 1]) * 100
    q = list(sales_data.keys())[i]
    print(f"  {q} Growth vs Previous: {growth:+.1f}%")

print("\n✅ Analysis complete. Try asking the AI: 'Summarise this script output.'")
