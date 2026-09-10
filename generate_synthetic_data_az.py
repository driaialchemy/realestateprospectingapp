"""
Synthetic data generator for the Hidden Equity Lead-Scoring blueprint — v2.

Now grounded in REAL, free, public Zillow Research ZHVI data (ZIP-level,
smoothed/seasonally-adjusted, mid-tier, all single-family + condo), filtered
to Arizona. Source:
  https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv
  (downloaded fresh, filtered to State == "AZ", saved locally as zhvi_arizona.csv)

Every contact in this synthetic CRM is assigned a REAL Arizona ZIP/city/metro,
and their property's appreciation path is drawn from that ZIP's ACTUAL ZHVI
history — not a fabricated curve. Mortgage rate-by-year still uses the
Freddie Mac PMMS-shaped reference (also free/public, not re-downloaded here).
Names/contact info/CRM behavior remain fully synthetic via Faker.

No paid vendor (Follow Up Boss, ATTOM, HouseCanary, etc.) is called.
"""

import numpy as np
import pandas as pd
from faker import Faker
from datetime import date, timedelta
import random

fake = Faker()
Faker.seed(42)
random.seed(42)
np.random.seed(42)

N = 300
TODAY = date(2026, 8, 27)

# ---------------------------------------------------------------------------
# Load real Arizona ZHVI data
# ---------------------------------------------------------------------------
zhvi = pd.read_csv("zhvi_arizona.csv")
date_cols = [c for c in zhvi.columns if c[:4].isdigit()]
zhvi = zhvi.dropna(subset=[date_cols[-1]])  # need a current value at minimum
zhvi = zhvi.reset_index(drop=True)

def zip_value_on(row, target_date):
    """Nearest available ZHVI monthly value for a ZIP on/near target_date."""
    cols = [c for c in date_cols if c <= target_date.isoformat()]
    if not cols:
        cols = date_cols[:1]
    col = cols[-1]
    val = row[col]
    if pd.isna(val):
        # walk backward to nearest non-null
        for c in reversed(date_cols[:date_cols.index(col) + 1]):
            if not pd.isna(row[c]):
                return row[c]
        return np.nan
    return val

RATE_BY_YEAR = {  # Freddie Mac PMMS-shaped, 30yr fixed annual avg (illustrative, free/public in shape)
    2013: 3.98, 2014: 4.17, 2015: 3.85, 2016: 3.65, 2017: 3.99,
    2018: 4.54, 2019: 3.94, 2020: 3.11, 2021: 2.96, 2022: 5.34,
    2023: 6.81, 2024: 6.72, 2025: 6.40, 2026: 6.10,
}
TODAY_RATE = 6.10

# ---------------------------------------------------------------------------
# Tenure readiness index — REPLACES the old arbitrary linear ramp.
#
# Source: U.S. Census Bureau ACS 2024 1-year estimates, Table B25038
# ("Tenure by Year Householder Moved Into Unit"), Arizona, owner-occupied
# households, pulled via the free Census Reporter API.
#
# Method: annualized "hazard" (attrition rate) derived from the decline in
# stock between consecutive tenure buckets, attributed to the earlier bucket
# (the cohort leaving it). This is a steady-state approximation, not a true
# survival model, and — per explicit decision — ONLY the 5yr+ buckets are
# used, because the 0-4yr buckets are confounded by the 2020-2022 homebuying
# volume spike (more people bought then, so more are "still there" now,
# independent of any actual propensity to sell). The 35+yr value is
# extrapolated (continuing the declining trend), not directly empirical.
#
# 0-4yr tenure is deliberately left as a low, judgment-based zone — NOT
# empirically derived — consistent with excluding the confounded buckets.
TENURE_READINESS_EMPIRICAL = {   # (min_year, max_year): index 0-100
    (5, 14):  100.0,   # empirical — annualized hazard 7.59%/yr (highest observed)
    (15, 24): 75.7,    # empirical — 5.74%/yr
    (25, 34): 68.8,    # empirical — 5.22%/yr
    (35, 999): 58.5,   # EXTRAPOLATED (continuation of declining trend), not empirical
}

def tenure_readiness_index(tenure_years):
    if tenure_years < 5:
        # Judgment-based, NOT empirical: conventional wisdom that very new owners
        # are low-propensity sellers. Simple linear ramp 0 -> 30, deliberately kept
        # well below every empirical bucket value so it reads as a floor, not a fit.
        return round((tenure_years / 5) * 30.0, 1)
    for (lo, hi), idx in TENURE_READINESS_EMPIRICAL.items():
        if lo <= tenure_years <= hi:
            return idx
    return 58.5  # fallback for anything beyond mapped range

RELATIONSHIP_TYPES = ["Past Client", "Sphere of Influence", "Cold CRM Entry", "Referral Source"]
LEAD_SOURCES = ["Referral", "Open House", "Web Lead", "Sphere", "Repeat Client", "Cold Import"]
TAGS_POOL = ["past_client", "farm_area", "investor", "first_time_buyer", "move_up",
             "downsizing_candidate", "renter_watchlist", "high_engagement", "unresponsive"]

def amortized_balance(principal, annual_rate_pct, years_elapsed, term_years=30):
    r = (annual_rate_pct / 100) / 12
    n = term_years * 12
    p = min(years_elapsed * 12, n)
    if r == 0:
        return max(principal - (principal / n) * p, 0)
    balance = principal * ((1 + r) ** n - (1 + r) ** p) / ((1 + r) ** n - 1)
    return round(max(balance, 0), 2)

rows_crm, rows_property, rows_avm = [], [], []

# Weight ZIP sampling toward higher-population ZIPs using SizeRank (lower = bigger)
zhvi_sorted = zhvi.sort_values("SizeRank")
weights = 1 / np.sqrt(zhvi_sorted["SizeRank"].rank())
zip_pool_idx = zhvi_sorted.index.to_numpy()
zip_weights = (weights / weights.sum()).to_numpy()

for i in range(1, N + 1):
    contact_id = f"C{i:05d}"
    name = fake.name()
    email = fake.free_email()
    phone = fake.phone_number()

    zrow = zhvi.loc[np.random.choice(zip_pool_idx, p=zip_weights)]
    zip_code = str(int(zrow["RegionName"]))
    city = zrow["City"]
    metro = zrow["Metro"]
    county = zrow["CountyName"]

    purchase_year = random.randint(2013, 2024)
    purchase_date = fake.date_between(date(purchase_year, 1, 1), date(purchase_year, 12, 31))
    tenure_years = round((TODAY - purchase_date).days / 365.25, 1)

    value_at_purchase = zip_value_on(zrow, purchase_date)
    value_today = zip_value_on(zrow, TODAY)
    if pd.isna(value_at_purchase) or pd.isna(value_today) or value_at_purchase <= 0:
        continue  # skip ZIPs with gaps rather than fabricate

    # This contact's actual purchase price = ZIP's index value at purchase,
    # with individual variance (their home isn't exactly the ZIP median)
    purchase_price = round(value_at_purchase * random.uniform(0.85, 1.18), -2)
    # Their home's appreciation tracks the ZIP's REAL appreciation ratio
    appreciation_ratio = value_today / value_at_purchase
    current_avm = round(purchase_price * appreciation_ratio, -2)

    tax_assessed = round(current_avm * random.uniform(0.75, 0.92), -2)

    orig_rate = RATE_BY_YEAR.get(purchase_year, 5.0) + round(random.uniform(-0.3, 0.3), 2)
    down_pct = random.choice([0.05, 0.10, 0.20, 0.20, 0.20])
    loan_principal = purchase_price * (1 - down_pct)
    remaining_balance = amortized_balance(loan_principal, orig_rate, tenure_years)

    equity = round(current_avm - remaining_balance, 2)
    rate_lock_delta = round(TODAY_RATE - orig_rate, 2)

    relationship = random.choices(RELATIONSHIP_TYPES, weights=[0.30, 0.35, 0.25, 0.10])[0]
    lead_source = random.choice(LEAD_SOURCES)
    last_contact_days_ago = int(np.random.exponential(120))
    last_contact_date = TODAY - timedelta(days=min(last_contact_days_ago, 1500))
    engagement_score = max(0, min(100, int(np.random.normal(50, 25))))
    n_tags = random.randint(1, 3)
    tags = ";".join(random.sample(TAGS_POOL, n_tags))

    # Real 1yr comp trend from ZHVI itself (last 12mo change for this ZIP)
    one_yr_ago = TODAY.replace(year=TODAY.year - 1)
    val_1yr_ago = zip_value_on(zrow, one_yr_ago)
    comp_trend_1yr_pct = round((value_today / val_1yr_ago - 1) * 100, 1) if val_1yr_ago and val_1yr_ago > 0 else 0.0

    rows_crm.append({
        "contact_id": contact_id, "name": name, "email": email, "phone": phone,
        "relationship_type": relationship, "lead_source": lead_source,
        "first_contact_date": fake.date_between(purchase_date, TODAY),
        "last_contact_date": last_contact_date,
        "engagement_score_0_100": engagement_score, "tags": tags,
    })

    rows_property.append({
        "contact_id": contact_id,
        "property_address": fake.street_address() + f", {city}, AZ {zip_code}",
        "zip_code": zip_code, "metro": metro, "county": county,
        "purchase_date": purchase_date, "purchase_price": purchase_price,
        "tax_assessed_value": tax_assessed, "ownership_tenure_years": tenure_years,
        "original_loan_rate_pct": orig_rate, "estimated_remaining_balance": remaining_balance,
        "zip_zhvi_1yr_change_pct": comp_trend_1yr_pct,
    })

    rows_avm.append({
        "contact_id": contact_id, "avm_estimate": current_avm,
        "avm_confidence_pct": round(random.uniform(78, 97), 1),
        "estimated_equity": equity, "rate_lock_delta_pts": rate_lock_delta,
        "last_updated": TODAY - timedelta(days=random.randint(0, 30)),
    })

df_crm = pd.DataFrame(rows_crm)
df_property = pd.DataFrame(rows_property)
df_avm = pd.DataFrame(rows_avm)

merged = df_crm.merge(df_property, on="contact_id").merge(df_avm, on="contact_id")
merged["tenure_readiness_index"] = merged["ownership_tenure_years"].apply(tenure_readiness_index)

merged["propensity_score_0_100"] = (
    (merged["estimated_equity"].clip(lower=0) / merged["estimated_equity"].clip(lower=0).max() * 40)
    + (merged["tenure_readiness_index"] / 100 * 25)   # NOW empirically-derived (ACS B25038, AZ), not a guessed linear ramp
    + (merged["zip_zhvi_1yr_change_pct"].clip(lower=0) / merged["zip_zhvi_1yr_change_pct"].clip(lower=0).max().clip(min=1) * 20)
    + (merged["engagement_score_0_100"] / 100 * 15)
).round(1)

with pd.ExcelWriter("/home/claude/synthetic_hidden_equity_data_az.xlsx", engine="openpyxl") as writer:
    df_crm.to_excel(writer, sheet_name="CRM Export", index=False)
    df_property.to_excel(writer, sheet_name="MLS_Public Record", index=False)
    df_avm.to_excel(writer, sheet_name="AVM Feed", index=False)
    merged[["contact_id", "name", "metro", "zip_code", "relationship_type",
            "ownership_tenure_years", "tenure_readiness_index", "estimated_equity",
            "rate_lock_delta_pts", "zip_zhvi_1yr_change_pct", "engagement_score_0_100",
            "propensity_score_0_100"]].sort_values(
        "propensity_score_0_100", ascending=False
    ).to_excel(writer, sheet_name="Scored View (sample)", index=False)

metros = sorted(m for m in df_property['metro'].unique() if isinstance(m, str))
print(f"done: {len(df_crm)} contacts across {df_property['zip_code'].nunique()} real AZ ZIPs, "
      f"metros: {metros}")
