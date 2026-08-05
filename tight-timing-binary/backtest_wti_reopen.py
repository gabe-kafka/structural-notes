#!/usr/bin/env python3
"""Backtest the xyz:CL 6:00 p.m. ET reopen trade with official Hyperliquid data."""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


API_URL = "https://api.hyperliquid.xyz/info"
ASSET = "xyz:CL"
ET = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
STOP_FRACTION = 0.025
TARGET_FRACTION = 0.050
GROWTH_TAKER_FEE = 0.00009


def epoch_ms(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def api_post(payload: dict[str, Any]) -> list[dict[str, Any]]:
    body = json.dumps(payload).encode()
    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
            if not isinstance(result, list):
                raise RuntimeError(f"Unexpected API response: {result!r}")
            return result
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")


def get_candles(start_ms: int, end_ms: int) -> list[dict[str, Any]]:
    return api_post(
        {
            "type": "candleSnapshot",
            "req": {
                "coin": ASSET,
                "interval": "1h",
                "startTime": start_ms,
                "endTime": end_ms,
            },
        }
    )


def get_funding(start_ms: int, end_ms: int) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    cursor = start_ms
    while cursor <= end_ms:
        page = api_post(
            {
                "type": "fundingHistory",
                "coin": ASSET,
                "startTime": cursor,
                "endTime": end_ms,
            }
        )
        if not page:
            break
        records.extend(page)
        next_cursor = int(page[-1]["time"]) + 1
        if next_cursor <= cursor or len(page) < 500:
            break
        cursor = next_cursor
    unique = {int(record["time"]): record for record in records}
    return [unique[key] for key in sorted(unique)]


@dataclass
class Result:
    side: str
    exit_reason: str
    exit_ms: int
    exit_price: float
    gross_return: float
    funding_return: float
    fee_return: float
    net_return: float
    stop_overshoot: float


def simulate(
    side: str,
    entry: float,
    bars: list[dict[str, Any]],
    funding: list[dict[str, Any]],
    entry_ms: int,
) -> Result:
    if side == "long":
        stop = entry * (1 - STOP_FRACTION)
        target = entry * (1 + TARGET_FRACTION)
    else:
        stop = entry * (1 + STOP_FRACTION)
        target = entry * (1 - TARGET_FRACTION)

    exit_reason = "timeout"
    exit_price = float(bars[-1]["c"])
    exit_ms = int(bars[-1]["T"])
    stop_overshoot = 0.0

    for bar in bars:
        opened = float(bar["o"])
        high = float(bar["h"])
        low = float(bar["l"])

        if side == "long":
            if opened <= stop:
                exit_reason = "stop-gap"
                exit_price = opened
                stop_overshoot = max(0.0, (stop - opened) / entry)
            elif opened >= target:
                exit_reason = "target"
                exit_price = target
            else:
                stop_hit = low <= stop
                target_hit = high >= target
                if stop_hit:
                    exit_reason = "stop-ambiguous" if target_hit else "stop"
                    exit_price = stop
                elif target_hit:
                    exit_reason = "target"
                    exit_price = target
                else:
                    continue
        else:
            if opened >= stop:
                exit_reason = "stop-gap"
                exit_price = opened
                stop_overshoot = max(0.0, (opened - stop) / entry)
            elif opened <= target:
                exit_reason = "target"
                exit_price = target
            else:
                stop_hit = high >= stop
                target_hit = low <= target
                if stop_hit:
                    exit_reason = "stop-ambiguous" if target_hit else "stop"
                    exit_price = stop
                elif target_hit:
                    exit_reason = "target"
                    exit_price = target
                else:
                    continue

        exit_ms = int(bar["T"])
        break

    price_ratio = exit_price / entry
    gross_return = price_ratio - 1 if side == "long" else 1 - price_ratio
    bar_by_hour = {int(bar["t"]): bar for bar in bars}
    funding_sum = 0.0
    for record in funding:
        record_ms = int(record["time"])
        if not entry_ms < record_ms <= exit_ms:
            continue
        hour_ms = record_ms // 3_600_000 * 3_600_000
        price_proxy = float(bar_by_hour.get(hour_ms, bars[-1])["o"])
        funding_sum += float(record["fundingRate"]) * price_proxy / entry
    funding_return = -funding_sum if side == "long" else funding_sum
    fee_return = GROWTH_TAKER_FEE * (1 + price_ratio)
    net_return = gross_return + funding_return - fee_return
    return Result(
        side=side,
        exit_reason=exit_reason,
        exit_ms=exit_ms,
        exit_price=exit_price,
        gross_return=gross_return,
        funding_return=funding_return,
        fee_return=fee_return,
        net_return=net_return,
        stop_overshoot=stop_overshoot,
    )


def fmt_pct(value: float) -> str:
    return f"{value * 100:.4f}%"


def summarize(values: list[float]) -> dict[str, str]:
    return {
        "mean": fmt_pct(statistics.fmean(values)),
        "median": fmt_pct(statistics.median(values)),
        "min": fmt_pct(min(values)),
        "max": fmt_pct(max(values)),
    }


def outcome_summary(pairs: list[tuple[Result, Result]]) -> dict[str, Any]:
    outcomes = [result for pair in pairs for result in pair]
    pair_gross = [statistics.fmean(r.gross_return for r in pair) for pair in pairs]
    pair_net = [statistics.fmean(r.net_return for r in pair) for pair in pairs]
    reasons = {
        reason: sum(result.exit_reason.startswith(reason) for result in outcomes)
        for reason in ("target", "stop", "timeout")
    }
    return {
        "coin_flip_gross_mean": fmt_pct(statistics.fmean(pair_gross)),
        "coin_flip_net_mean": fmt_pct(statistics.fmean(pair_net)),
        "positive_net_probability": fmt_pct(
            sum(result.net_return > 0 for result in outcomes) / len(outcomes)
        ),
        "target_probability": fmt_pct(reasons["target"] / len(outcomes)),
        "stop_probability": fmt_pct(reasons["stop"] / len(outcomes)),
        "timeout_probability": fmt_pct(reasons["timeout"] / len(outcomes)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks", type=int, default=12)
    parser.add_argument(
        "--as-of",
        help="ISO timestamp; default is now (example: 2026-08-03T13:00:00-04:00)",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path(__file__).with_name("wti-reopen-backtest.csv"),
    )
    args = parser.parse_args()

    as_of = datetime.fromisoformat(args.as_of) if args.as_of else datetime.now(ET)
    as_of = as_of.astimezone(ET)
    window_start = as_of - timedelta(weeks=args.weeks)
    fetch_start = window_start - timedelta(hours=2)
    candles = get_candles(epoch_ms(fetch_start), epoch_ms(as_of))
    funding = get_funding(epoch_ms(fetch_start), epoch_ms(as_of))
    candle_by_start = {int(candle["t"]): candle for candle in candles}

    events: list[datetime] = []
    cursor = window_start.date()
    while cursor <= as_of.date():
        event = datetime(cursor.year, cursor.month, cursor.day, 18, tzinfo=ET)
        if cursor.weekday() in {0, 1, 2, 3, 6}:
            exit_deadline = event + timedelta(hours=23)
            if event >= window_start and exit_deadline <= as_of:
                events.append(event)
        cursor += timedelta(days=1)

    rows: list[dict[str, Any]] = []
    sensitivity: dict[int, list[tuple[Result, Result]]] = {
        horizon: [] for horizon in (1, 6, 23)
    }
    excluded: list[str] = []
    for event in events:
        entry_start = event - timedelta(hours=1)
        entry_bar = candle_by_start.get(epoch_ms(entry_start))
        bars = [
            candle_by_start.get(epoch_ms(event + timedelta(hours=offset)))
            for offset in range(23)
        ]
        if entry_bar is None or any(bar is None for bar in bars):
            excluded.append(event.isoformat())
            continue
        complete_bars = [bar for bar in bars if bar is not None]
        entry = float(entry_bar["c"])
        for horizon in sensitivity:
            sensitivity[horizon].append(
                (
                    simulate(
                        "long",
                        entry,
                        complete_bars[:horizon],
                        funding,
                        int(entry_bar["T"]),
                    ),
                    simulate(
                        "short",
                        entry,
                        complete_bars[:horizon],
                        funding,
                        int(entry_bar["T"]),
                    ),
                )
            )
        long, short = sensitivity[23][-1]
        first_open = float(complete_bars[0]["o"])
        first_close = float(complete_bars[0]["c"])
        reopen_gap = first_open / entry - 1
        first_hour_return = first_close / entry - 1
        first_hour_up = float(complete_bars[0]["h"]) / entry - 1
        first_hour_down = 1 - float(complete_bars[0]["l"]) / entry
        coin_flip_gross = (long.gross_return + short.gross_return) / 2
        coin_flip_net = (long.net_return + short.net_return) / 2
        rows.append(
            {
                "event_et": event.isoformat(),
                "entry_price": entry,
                "first_hour_open": first_open,
                "reopen_gap": reopen_gap,
                "first_hour_close": first_close,
                "first_hour_return": first_hour_return,
                "first_hour_up_excursion": first_hour_up,
                "first_hour_down_excursion": first_hour_down,
                "long_exit": long.exit_price,
                "long_reason": long.exit_reason,
                "long_gross": long.gross_return,
                "long_funding": long.funding_return,
                "long_fees": long.fee_return,
                "long_net": long.net_return,
                "long_stop_overshoot": long.stop_overshoot,
                "short_exit": short.exit_price,
                "short_reason": short.exit_reason,
                "short_gross": short.gross_return,
                "short_funding": short.funding_return,
                "short_fees": short.fee_return,
                "short_net": short.net_return,
                "short_stop_overshoot": short.stop_overshoot,
                "coin_flip_gross": coin_flip_gross,
                "coin_flip_net": coin_flip_net,
            }
        )

    if not rows:
        raise RuntimeError("No complete events found")

    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("w", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    long_results = [row["long_net"] for row in rows]
    short_results = [row["short_net"] for row in rows]
    all_results = long_results + short_results
    coin_flip_gross = [row["coin_flip_gross"] for row in rows]
    coin_flip_net = [row["coin_flip_net"] for row in rows]
    coin_flip_net_mean = statistics.fmean(coin_flip_net)
    coin_flip_net_se = statistics.stdev(coin_flip_net) / math.sqrt(len(coin_flip_net))
    all_winners = [value for value in all_results if value > 0]
    all_losers = [-value for value in all_results if value <= 0]
    average_winner = statistics.fmean(all_winners)
    average_loser = statistics.fmean(all_losers)
    reasons = {
        side: {
            reason: sum(row[f"{side}_reason"] == reason for row in rows)
            for reason in sorted({row[f"{side}_reason"] for row in rows})
        }
        for side in ("long", "short")
    }
    output = {
        "asset": ASSET,
        "as_of_et": as_of.isoformat(),
        "window_start_et": window_start.isoformat(),
        "event_count": len(rows),
        "hourly_candle_count": len(candles),
        "funding_record_count": len(funding),
        "excluded_events": excluded,
        "entry": "close of 5:00-6:00 p.m. ET hourly candle (5:59 p.m. proxy)",
        "exit": "first 2.5% stop or 5.0% target; else 4:59 p.m. ET next day",
        "ambiguity_rule": "stop first when one hourly candle reaches both thresholds",
        "fee_rate_per_fill": fmt_pct(GROWTH_TAKER_FEE),
        "funding_method": "official hourly rate times hourly-open oracle-price proxy",
        "coin_flip_gross": summarize(coin_flip_gross),
        "coin_flip_net": summarize(coin_flip_net),
        "coin_flip_net_mean_approx_95pct_ci": [
            fmt_pct(coin_flip_net_mean - 1.96 * coin_flip_net_se),
            fmt_pct(coin_flip_net_mean + 1.96 * coin_flip_net_se),
        ],
        "long_net": summarize(long_results),
        "short_net": summarize(short_results),
        "positive_net_probability_50_50_direction": fmt_pct(
            sum(value > 0 for value in all_results) / len(all_results)
        ),
        "target_probability_50_50_direction": fmt_pct(
            sum(
                row[f"{side}_reason"] == "target"
                for row in rows
                for side in ("long", "short")
            )
            / (2 * len(rows))
        ),
        "average_net_winner": fmt_pct(average_winner),
        "average_net_loser": fmt_pct(average_loser),
        "forced_50pct_profitable_trade_expectancy": fmt_pct(
            0.5 * (average_winner - average_loser)
        ),
        "reasons": reasons,
        "horizon_sensitivity_same_events": {
            f"{horizon}h": outcome_summary(pairs)
            for horizon, pairs in sensitivity.items()
        },
        "day_group_23h": {
            label: outcome_summary(
                [
                    sensitivity[23][index]
                    for index, row in enumerate(rows)
                    if (datetime.fromisoformat(row["event_et"]).weekday() == 6)
                    == is_sunday
                ]
            )
            for label, is_sunday in (("Sunday", True), ("Monday-Thursday", False))
        },
        "first_hour_signed_return": summarize(
            [row["first_hour_return"] for row in rows]
        ),
        "first_hour_absolute_return": summarize(
            [abs(row["first_hour_return"]) for row in rows]
        ),
        "first_hour_max_excursion": summarize(
            [
                max(row["first_hour_up_excursion"], row["first_hour_down_excursion"])
                for row in rows
            ]
        ),
        "first_hour_reached_2_5pct_either_way": fmt_pct(
            sum(
                max(row["first_hour_up_excursion"], row["first_hour_down_excursion"])
                >= STOP_FRACTION
                for row in rows
            )
            / len(rows)
        ),
        "first_hour_reached_5pct_either_way": fmt_pct(
            sum(
                max(row["first_hour_up_excursion"], row["first_hour_down_excursion"])
                >= TARGET_FRACTION
                for row in rows
            )
            / len(rows)
        ),
        "stop_gap_count": sum(
            "stop-gap" == row[f"{side}_reason"]
            for row in rows
            for side in ("long", "short")
        ),
        "max_stop_overshoot": fmt_pct(
            max(
                row[f"{side}_stop_overshoot"]
                for row in rows
                for side in ("long", "short")
            )
        ),
        "csv": str(args.csv.resolve()),
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
