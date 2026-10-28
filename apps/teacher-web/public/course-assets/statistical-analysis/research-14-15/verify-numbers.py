# Numerical transformations only; no invented individual data or empirical model fit.
import json, math
or_value, baseline = 2.0, .20
odds = baseline / (1 - baseline)
new_probability = or_value * odds / (1 + or_value * odds)
ess = lambda w: sum(w) ** 2 / sum(x*x for x in w)
out = {
 "Bloom_2013_TFP_percent": 100 * math.expm1(.154),
 "Bloom_2024_quit_difference_pp": 4.8 - 7.2,
 "Bloom_2024_quit_relative_percent": 100 * (4.8 / 7.2 - 1),
 "Zervas_approx_revenue_percent_for_10pct_supply": -.039 * 10,
 "classroom_OR_demo_probability": new_probability,
 "classroom_OR_demo_risk_ratio": new_probability / baseline,
 "classroom_ESS_equal": ess([1, 1, 1, 1]),
 "classroom_ESS_concentrated": ess([1, 1, 1, 7])
}
assert abs(out["Bloom_2013_TFP_percent"] - 16.649088677844) < 1e-8
assert abs(out["Bloom_2024_quit_difference_pp"] + 2.4) < 1e-12
assert abs(new_probability - 1/3) < 1e-12
assert abs(ess([1, 1, 1, 7]) - 100/52) < 1e-12
print(json.dumps(out, ensure_ascii=False, indent=2))
