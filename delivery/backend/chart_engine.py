import io

import matplotlib
matplotlib.use("Agg")  # headless/server-safe backend — no display needed
import matplotlib.pyplot as plt

import pandas as pd

from analysis import find_target_column, find_date_column

CHART_PALETTE = ["#7C5CFC", "#22B07D", "#3B82F6", "#F5A623", "#EC4899", "#22D3EE", "#64748B", "#F97316"]

MAX_CATEGORIES = 10
MIN_CHARTS = 6
MAX_CHARTS = 8


def render_chart_png(chart, width_in=6.2, height_in=3.4, dpi=150):
    """
    Renders one chart spec (the same {type, title, x/y or labels/values}
    shape used by the frontend) to PNG bytes with matplotlib, for embedding
    in the PDF report — the report shows the same charts as the Visualizations
    tab rather than text-only summary stats.
    """
    fig, ax = plt.subplots(figsize=(width_in, height_in), dpi=dpi)

    try:
        chart_type = chart.get("type")

        if chart_type == "pie":
            labels = chart.get("labels", [])
            values = chart.get("values", [])
            colors = [CHART_PALETTE[i % len(CHART_PALETTE)] for i in range(len(labels))]
            ax.pie(
                values,
                labels=labels,
                autopct=lambda p: f"{p:.0f}%" if p >= 4 else "",
                colors=colors,
                textprops={"fontsize": 8},
                startangle=90,
            )
            ax.axis("equal")

        elif chart_type == "line":
            x = chart.get("x", [])
            y = chart.get("y", [])
            ax.plot(range(len(x)), y, color=CHART_PALETTE[1], linewidth=2, marker="o", markersize=3)
            ax.set_xticks(range(len(x)))
            ax.set_xticklabels(x, rotation=40, ha="right", fontsize=7)
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.grid(axis="y", linestyle="--", alpha=0.4)

        else:  # bar
            x = [str(v) for v in chart.get("x", [])]
            y = chart.get("y", [])
            ax.bar(range(len(x)), y, color=CHART_PALETTE[0])
            ax.set_xticks(range(len(x)))
            ax.set_xticklabels(x, rotation=40, ha="right", fontsize=7)
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.grid(axis="y", linestyle="--", alpha=0.4)

        ax.set_title(chart.get("title", ""), fontsize=10, fontweight="bold", pad=10)
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        return buf

    finally:
        plt.close(fig)


def _top_n_with_other(series, n=MAX_CATEGORIES):
    """value_counts()-style series -> (labels, values), folding the long
    tail into a single 'Other' bucket so pies/bars stay readable."""
    if len(series) > n:
        top = series.iloc[:n]
        other = series.iloc[n:].sum()
        labels = top.index.astype(str).tolist() + ["Other"]
        values = top.tolist() + [other]
    else:
        labels = series.index.astype(str).tolist()
        values = series.tolist()
    return labels, values


def _histogram(df, col, bins=6):
    data = df[col].dropna()
    if data.empty or data.nunique() < 2:
        return None
    try:
        binned = pd.cut(data, bins=bins)
    except Exception:
        return None
    counts = binned.value_counts().sort_index()
    labels = [f"{b.left:,.0f}–{b.right:,.0f}" for b in counts.index]
    return labels, counts.tolist()


def _is_id_like(col_name, series, rows):
    name = str(col_name).lower().strip()
    patterns = ("_id", "id_", "_no", "no_", "_number", "_code")
    return name == "id" or name == "no" or any(p in f"_{name}_" for p in patterns)


def _is_high_cardinality(series, rows):
    n = series.nunique(dropna=True)
    return n > 20 and n > rows * 0.4


def generate_chart_data(df):
    """
    Builds a set of chart specs the frontend (Recharts) and the PDF report
    (matplotlib) both render from the same {type, title, x/y or labels/values}
    shape. Combines dataset-specific charts (built from whatever categorical/
    numeric/date columns exist) with a couple of charts that work on any
    dataset (missing values per column, column type breakdown), so a real
    dataset reliably produces at least MIN_CHARTS charts rather than the 2-3
    a naive "first numeric, first categorical" approach gives you.
    """
    charts = []
    rows = len(df)

    raw_numeric_cols = df.select_dtypes(include=["int64", "float64", "int32", "float32"]).columns.tolist()
    raw_categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    date_col, parsed_dates = find_date_column(df)

    # Drop ID-like numeric columns (Order_ID, primary keys) — they're never
    # a meaningful "target" or histogram subject.
    numeric_cols = [c for c in raw_numeric_cols if not _is_id_like(c, df[c], rows)]
    if not numeric_cols:
        numeric_cols = raw_numeric_cols  # better a noisy chart than none

    # Drop the date column (handled separately) and anything so high-cardinality
    # it's really an identifier (customer names, free-text fields).
    categorical_cols = [c for c in raw_categorical_cols if c != date_col]
    grouping_cols = [c for c in categorical_cols if not _is_high_cardinality(df[c], rows)]
    if not grouping_cols:
        grouping_cols = categorical_cols

    target_col = find_target_column(df, numeric_cols)

    # 1. Target sum by primary category
    if grouping_cols and target_col:
        cat = grouping_cols[0]
        grouped = (
            df.groupby(cat)[target_col].sum(numeric_only=True)
            .sort_values(ascending=False)
        )
        labels, values = _top_n_with_other(grouped)
        charts.append({
            "type": "bar",
            "title": f"Total {target_col} by {cat}",
            "x": labels,
            "y": values,
        })

    # 2. Primary category distribution
    if grouping_cols:
        cat = grouping_cols[0]
        vc = df[cat].value_counts()
        labels, values = _top_n_with_other(vc)
        charts.append({
            "type": "pie",
            "title": f"{cat} Distribution",
            "labels": labels,
            "values": values,
        })

    # 3. Target sum by secondary category, or record count by primary category
    if len(grouping_cols) > 1 and target_col:
        cat2 = grouping_cols[1]
        grouped = (
            df.groupby(cat2)[target_col].sum(numeric_only=True)
            .sort_values(ascending=False)
        )
        labels, values = _top_n_with_other(grouped)
        charts.append({
            "type": "bar",
            "title": f"Total {target_col} by {cat2}",
            "x": labels,
            "y": values,
        })
    elif grouping_cols:
        cat = grouping_cols[0]
        vc = df[cat].value_counts()
        labels, values = _top_n_with_other(vc)
        charts.append({
            "type": "bar",
            "title": f"Record Count by {cat}",
            "x": labels,
            "y": values,
        })

    # 4. Trend over time, or one numeric column against another
    if date_col and target_col:
        tmp = df.copy()
        tmp["_parsed_date"] = parsed_dates
        tmp = tmp.dropna(subset=["_parsed_date"]).set_index("_parsed_date")
        try:
            monthly = tmp[target_col].resample("ME").sum()
        except Exception:
            monthly = tmp[target_col].resample("M").sum()
        monthly = monthly[monthly.notna()]
        if len(monthly) >= 2:
            charts.append({
                "type": "line",
                "title": f"{target_col} Trend Over Time",
                "x": [d.strftime("%b %Y") for d in monthly.index],
                "y": monthly.tolist(),
            })
    elif len(numeric_cols) >= 2:
        x_col, y_col = numeric_cols[0], numeric_cols[1]
        sub = df[[x_col, y_col]].dropna().sort_values(x_col)
        if len(sub) >= 2:
            charts.append({
                "type": "line",
                "title": f"{y_col} vs {x_col}",
                "x": sub[x_col].tolist(),
                "y": sub[y_col].tolist(),
            })

    # 5. Average target by primary category (a distinct metric from chart #1's sum)
    if grouping_cols and target_col:
        cat = grouping_cols[0]
        grouped = (
            df.groupby(cat)[target_col].mean(numeric_only=True)
            .round(2)
            .sort_values(ascending=False)
        )
        labels, values = _top_n_with_other(grouped)
        charts.append({
            "type": "bar",
            "title": f"Average {target_col} by {cat}",
            "x": labels,
            "y": values,
        })

    # 6. Distribution of the target numeric column
    if target_col:
        hist = _histogram(df, target_col)
        if hist:
            labels, values = hist
            charts.append({
                "type": "bar",
                "title": f"{target_col} Distribution",
                "x": labels,
                "y": values,
            })

    # 7. Secondary category distribution
    if len(grouping_cols) > 1:
        cat2 = grouping_cols[1]
        vc2 = df[cat2].value_counts()
        labels, values = _top_n_with_other(vc2)
        charts.append({
            "type": "pie",
            "title": f"{cat2} Distribution",
            "labels": labels,
            "values": values,
        })

    # 8. Distribution of a second numeric column, if there's headroom left
    other_numeric = [c for c in numeric_cols if c != target_col]
    if other_numeric:
        hist = _histogram(df, other_numeric[0])
        if hist:
            labels, values = hist
            charts.append({
                "type": "bar",
                "title": f"{other_numeric[0]} Distribution",
                "x": labels,
                "y": values,
            })

    # Universal charts — these only depend on the dataframe's shape/dtypes,
    # not on any particular column existing, so they're what guarantees a
    # minimum chart count even for sparse or purely-numeric datasets.
    missing_by_col = df.isnull().sum()
    if missing_by_col.sum() >= 0:  # always true; keep the shape explicit
        charts.append({
            "type": "bar",
            "title": "Missing Values by Column",
            "x": missing_by_col.index.astype(str).tolist(),
            "y": missing_by_col.tolist(),
        })

    datetime_cols = df.select_dtypes(include=["datetime64[ns]"]).columns.tolist()
    if date_col and date_col not in datetime_cols:
        datetime_cols = datetime_cols + [date_col]
    type_counts = {
        "Numeric": len(numeric_cols),
        "Text": len([c for c in categorical_cols if c not in datetime_cols]),
        "Date/Time": len(datetime_cols),
    }
    type_counts = {k: v for k, v in type_counts.items() if v > 0}
    if type_counts:
        charts.append({
            "type": "pie",
            "title": "Column Type Breakdown",
            "labels": list(type_counts.keys()),
            "values": list(type_counts.values()),
        })

    # If a sparse dataset still came up short, pad out with distribution
    # charts for any remaining numeric columns before giving up.
    used_titles = {c["title"] for c in charts}
    for col in numeric_cols:
        if len(charts) >= MIN_CHARTS:
            break
        hist = _histogram(df, col)
        title = f"{col} Distribution"
        if hist and title not in used_titles:
            labels, values = hist
            charts.append({"type": "bar", "title": title, "x": labels, "y": values})
            used_titles.add(title)

    return charts[:MAX_CHARTS]
