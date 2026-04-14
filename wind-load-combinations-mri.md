# Wind Load Equivalence — LRFD, ASD, and the 25‑yr Serviceability Wind

The same wind demand can be expressed three ways in ASCE 7. They produce the same engineering answer because they are all routes to the same service‑ or strength‑level wind pressure.

## The headline equivalence

```
LRFD with 700‑yr wind (V = 117 mph in NYC, factor 1.0 W)
   ≡  ASD  with 700‑yr wind (V = 117 mph in NYC, factor 0.6 W)
   ≡  ASD  with  25‑yr wind (V =  87 mph in NYC, factor 1.0 W)
```

NYC values used throughout (Risk Category II):

| Symbol | Source | Value |
|---|---|---|
| `V_700` | ASCE 7 Fig 26.5‑1B (strength map) | **117 mph** |
| `V_50`  | derived: `√0.6 × V_700` (50‑yr equivalent) | ≈ 90.6 mph |
| `V_25`  | ASCE 7 Fig CC.2‑2 (service map, 25‑yr MRI) | **87 mph** |

## Parallel #1 — the three formulations on the same line

| Format | Combination | Wind term | Effective pressure (∝ V²) | Level |
|---|---|---|---|---|
| **LRFD strength** | `1.2D + 1.0W + L + 0.5Lr` | `1.0 × W(117)` | `1.0 × 117²` = **13,689** | Ultimate (700‑yr) |
| **ASD strength** | `1.0D + 0.6W` | `0.6 × W(117)` | `0.6 × 117²` = **8,213** | Service ≈ 50‑yr |
| **ASD service** | `1.0D + 0.5L + 1.0W₂₅` | `1.0 × W(87)` | `1.0 × 87²` = **7,569** | Service (25‑yr) |

The two service‑level rows are within ~8% of each other in NYC. They are different paths to the same engineering check.

The LRFD row is `1 / 0.6 ≈ 1.67×` larger by design — that load factor is consumed on the **resistance** side by `ϕ` (LRFD) instead of `1/Ω` (ASD), so the final D/C ratio matches.

## Parallel #2 — every wind‑bearing combination, three columns

ASCE 7‑16/22 strength combos and their service equivalents, side by side. All three columns describe the same physical demand on the structure.

| ASCE 7 § | LRFD&nbsp;&nbsp;`V_ult = 117` | ASD strength&nbsp;&nbsp;`V_ult = 117` | Service&nbsp;&nbsp;`V_25 = 87` |
|---|---|---|---|
| Primary D + L + W | **`1.2D + 1.0W + L + 0.5Lr`**&nbsp;&nbsp;§2.3.1‑4 | **`1.0D + 0.75L + 0.45W + 0.75Lr`**&nbsp;&nbsp;§2.4.1‑6a | **`1.0D + 0.5L + 1.0W₂₅`**&nbsp;&nbsp;§CC.1.2 |
| Dead + Wind only | **`1.2D + 1.0W`**&nbsp;&nbsp;(§2.3.1‑4 with `L = Lr = S = R = 0`; LRFD has no standalone D+W combo — companion live load is always assumed present) | **`1.0D + 0.6W`**&nbsp;&nbsp;§2.4.1‑5 | **`1.0D + 1.0W₂₅`**&nbsp;&nbsp;§CC.1.2 |
| Net uplift / overturning | **`0.9D + 1.0W`**&nbsp;&nbsp;§2.3.1‑5 | **`0.6D + 0.6W`**&nbsp;&nbsp;§2.4.1‑7 | (strength check, n/a) |

## Parallel #3 — effective wind pressure each combo delivers

Holding everything except the wind term constant, in NYC:

| Combo | Wind term | × V² | Pressure (∝) | Tier |
|---|---|---|---|---|
| LRFD §2.3.1‑4 | `1.0 W` | `1.0 × 117²` | **13,689** | Ultimate |
| LRFD §2.3.1‑5 | `1.0 W` | `1.0 × 117²` | **13,689** | Ultimate |
| ASD §2.4.1‑5  | `0.6 W` | `0.6 × 117²` | **8,213**  | Service ≈ 50‑yr |
| ASD §2.4.1‑7  | `0.6 W` | `0.6 × 117²` | **8,213**  | Service ≈ 50‑yr |
| Service §CC.1.2 | `1.0 W₂₅` | `1.0 × 87²` | **7,569** | Service (25‑yr) |
| ASD §2.4.1‑6a | `0.45 W` | `0.45 × 117²` | **6,160** | Service, further reduced (the 0.75 multiplier on combo 6a) |

**Pattern:** every "service‑level" wind term clusters in **6,000 – 8,500**, the LRFD ultimate term sits at **13,689**, and the ratio between them is **~1.67** — the load factor that gets absorbed on the resistance side.

## Why the three are equivalent

1. **The strength map gives an ultimate V.** ASCE 7‑10 re‑mapped basic wind speed from 50‑yr nominal to 700‑yr ultimate. `V` went up by `√1.6 ≈ 1.265`, pressure went up by `1.6`.

2. **The 0.6 in `0.6W` is `1/1.6`.** It converts the 700‑yr ultimate pressure back to a service‑level pressure — specifically, the 50‑yr equivalent. It is a units conversion, not a safety judgment.

3. **The 25‑yr service map gives a service‑level V directly.** No conversion factor needed — pair with `1.0W`.

In NYC the 50‑yr and 25‑yr winds happen to be very close (90 vs 87 mph), so the two service paths land on essentially the same number.

## Mental model

| You're doing… | Use this map | Wind factor |
|---|---|---|
| LRFD strength check | 700‑yr (Fig 26.5‑1) | `1.0 W` |
| ASD strength check | 700‑yr (Fig 26.5‑1) | `0.6 W` |
| Drift / cladding deflection | 25‑yr (Fig CC.2‑2) | `1.0 W` |
| Occupant comfort / acceleration | 10‑yr (Fig CC.2‑1) | `1.0 W` |

**Never** combine a 25‑yr wind with a `0.6` factor — that double‑counts the reduction.
**Never** combine a 700‑yr wind with `1.0W` in an ASD strength check — that overdesigns by 1.67×.

## Where called out

| Reference | Content |
|---|---|
| ASCE 7‑16/22 **§2.3.1, Eq 6** | LRFD strength: `1.2D + 1.0W + L + 0.5(Lr/S/R)` — uses 700‑yr map |
| ASCE 7‑16/22 **§2.4.1, Eq 8 / 9** | ASD strength: `1.0D + 0.6W`, `0.6D + 0.6W` — uses 700‑yr map |
| ASCE 7‑16/22 **Appendix C** | Scope and intent of serviceability checks |
| ASCE 7‑16/22 **Commentary §CC.1.2** | Recommended service combos: `D + 0.5L + W_a` (no 0.6) |
| ASCE 7‑16/22 **Commentary §CC.2** | Drift, vibration, occupant comfort, MRI selection |
| ASCE 7‑16 **Fig CC.2‑1 … CC.2‑4** | Service wind speed maps: 10 / 25 / 50 / 100‑yr MRI |
| **AISC Design Guide 3** §3, §4 | Practitioner guidance on which MRI to pair with which serviceability check |

## Math sketch

Wind pressure scales as `q ∝ V²`.

```
V_700 / V_50  =  √1.6  ≈  1.265
q(V_700)      =  1.6 × q(V_50)
```

So:

```
LRFD strength :  1.0 × q(V_700)  =  1.6 × q(V_50)        (ultimate demand)
ASD  strength :  0.6 × q(V_700)  ≈  1.0 × q(V_50)        (service ≈ 50‑yr)
ASD  service  :  1.0 × q(V_25)   ≈  1.0 × q(V_50)        (service ≈ 25‑yr ≈ 50‑yr in NYC)
```

The first row is `1/0.6 ≈ 1.67×` the others. That factor lives on the resistance side as `ϕ ÷ (1/Ω)` and cancels out when you compute the demand‑to‑capacity ratio.
