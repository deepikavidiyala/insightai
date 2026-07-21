import pandas as pd
import io


TARGET_KEYWORDS = [
    "revenue", "sales", "total", "amount", "profit",
    "earning", "income", "price", "value", "cost"
]


def find_target_column(df, numeric_cols=None):
    if numeric_cols is None:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
    lower_map = {col: str(col).lower() for col in numeric_cols}
    for keyword in TARGET_KEYWORDS:
        for col in numeric_cols:
            if keyword in lower_map[col]:
                return col
    return numeric_cols[0] if numeric_cols else None


def find_date_column(df):
    for col in df.columns:
        name = str(col).lower()
        if "date" in name or "time" in name:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().sum() >= max(len(df) * 0.5, 2):
                return col, parsed
    return None, None


# Kept as thin aliases so the rest of this module (written before these
# helpers were made public for reuse in chart_engine.py) doesn't need to change.
def _find_target_column(df, numeric_cols):
    return find_target_column(df, numeric_cols)


def _find_date_column(df):
    return find_date_column(df)


def _find_age_column(df, numeric_cols):
    for col in numeric_cols:
        if "age" in str(col).lower():
            return col
    return None


def compute_insight_facts(df, max_facts=6):
    """
    Computes a short list of plain-language, numerically grounded facts about
    a dataframe (shape, data quality, the dominant category driving a numeric
    "target" column, a time trend if a date column exists, and an age-segment
    breakdown if an age column exists). Every number here comes directly from
    the data — this is what "AI insights" are phrased from, rather than left
    for a language model to invent from a row count alone.
    """
    facts = []
    rows, cols = len(df), len(df.columns)

    facts.append(f"Dataset contains {cols} columns and {rows} rows.")

    total_cells = rows * cols
    missing_total = int(df.isnull().sum().sum())
    missing_pct = round((missing_total / total_cells) * 100, 1) if total_cells else 0
    level = "very low" if missing_pct < 5 else "moderate" if missing_pct < 15 else "high"
    facts.append(f"Missing values are {level} ({missing_pct}%).")

    duplicates = int(df.duplicated().sum())
    if duplicates > 0 and rows:
        dup_pct = round((duplicates / rows) * 100, 1)
        noun = "row" if duplicates == 1 else "rows"
        verb = "was" if duplicates == 1 else "were"
        facts.append(f"{duplicates} duplicate {noun} {verb} found ({dup_pct}% of the dataset).")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    target_col = _find_target_column(df, numeric_cols)

    if target_col is not None:
        col_data = df[target_col].dropna()
        if len(col_data):
            facts.append(
                f"{target_col} ranges from {col_data.min():,.0f} to {col_data.max():,.0f}, "
                f"averaging {col_data.mean():,.0f} per record."
            )

    best_cat = None
    best_share = 0.0
    for cat in categorical_cols:
        nunique = df[cat].nunique(dropna=True)
        if nunique < 2 or nunique > 15:
            continue
        try:
            if target_col is not None:
                grp = df.groupby(cat)[target_col].sum(numeric_only=True)
            else:
                grp = df[cat].value_counts()
        except Exception:
            continue
        total = grp.sum()
        if not total:
            continue
        share = grp.max() / total
        if share > best_share:
            best_share = share
            best_cat = (cat, grp.idxmax(), share)

    if best_cat:
        cat_col, top_val, share = best_cat
        pct = round(share * 100, 1)
        if target_col is not None:
            facts.append(
                f"{target_col} is highly concentrated in '{top_val}' within {cat_col}, "
                f"accounting for {pct}% of the total."
            )
        else:
            facts.append(f"'{top_val}' is the dominant {cat_col}, representing {pct}% of records.")

    date_col, parsed_dates = _find_date_column(df)
    if date_col is not None and target_col is not None:
        tmp = df.copy()
        tmp["_parsed_date"] = parsed_dates
        tmp = tmp.dropna(subset=["_parsed_date"]).set_index("_parsed_date")
        try:
            quarterly = tmp[target_col].resample("QE").sum()
        except Exception:
            quarterly = tmp[target_col].resample("Q").sum()
        quarterly = quarterly[quarterly != 0]
        if len(quarterly) >= 2:
            first, last = quarterly.iloc[0], quarterly.iloc[-1]
            if first:
                change = round(((last - first) / first) * 100, 1)
                direction = "growth" if change >= 0 else "decline"
                last_label = str(quarterly.index[-1].to_period("Q"))
                facts.append(
                    f"{target_col} shows {abs(change)}% {direction} over the period covered, "
                    f"with {last_label} the strongest."
                )

    age_col = _find_age_column(df, numeric_cols)
    if age_col is not None and target_col is not None:
        tmp2 = df.dropna(subset=[age_col, target_col]).copy()
        if len(tmp2):
            bins = [0, 18, 25, 35, 45, 60, 200]
            labels = ["Under 18", "18-25", "26-35", "36-45", "46-60", "60+"]
            tmp2["_age_bucket"] = pd.cut(tmp2[age_col], bins=bins, labels=labels)
            grp2 = tmp2.groupby("_age_bucket", observed=True)[target_col].sum(numeric_only=True)
            total2 = grp2.sum()
            if total2:
                top_bucket = grp2.idxmax()
                pct2 = round((grp2.max() / total2) * 100, 1)
                facts.append(
                    f"Customers aged {top_bucket} contribute the most to {target_col.lower()} "
                    f"({pct2}% of the total)."
                )

    return facts[:max_facts]


def read_dataset(file_bytes, filename):

    filename = filename.lower()

    if filename.endswith(".csv"):

        df = pd.read_csv(
            io.BytesIO(file_bytes)
        )

    elif (
        filename.endswith(".xlsx")
        or filename.endswith(".xls")
    ):

        df = pd.read_excel(
            io.BytesIO(file_bytes)
        )

    elif filename.endswith(".json"):

        df = pd.read_json(
            io.BytesIO(file_bytes)
        )

    else:
        raise Exception(
            "Unsupported file format"
        )

    return df


def compute_quality_suggestions(df, max_suggestions=6):
    """
    Produces specific, actionable suggestions tied to issues actually found
    in this dataframe (which columns are missing data and by how much,
    duplicate rows, constant columns) rather than a fixed generic list —
    this is what drove the quality_score down, and what to do about it.
    """
    rows = len(df)
    if rows == 0:
        return ["The dataset is empty — upload a file with at least one row of data."]

    suggestions = []

    duplicates = int(df.duplicated().sum())
    if duplicates > 0:
        dup_pct = round((duplicates / rows) * 100, 1)
        noun = "row" if duplicates == 1 else "rows"
        verb = "was" if duplicates == 1 else "were"
        suggestions.append(
            f"{duplicates} duplicate {noun} ({dup_pct}%) {verb} found — removing them will "
            f"directly raise the quality score and avoid double-counting in totals."
        )

    missing_by_col = df.isnull().sum()
    missing_cols = missing_by_col[missing_by_col > 0].sort_values(ascending=False)
    for col, cnt in missing_cols.items():
        pct = round((cnt / rows) * 100, 1)
        if pct >= 30:
            suggestions.append(
                f"'{col}' is missing {pct}% of its values — it may be too incomplete to "
                f"trust in analysis; consider collecting the missing data or excluding this column."
            )
        else:
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            fix = "filling with the column's mean or median" if is_numeric else "filling with the most common value"
            noun = "value" if cnt == 1 else "values"
            suggestions.append(
                f"'{col}' has {int(cnt)} missing {noun} ({pct}%) — consider {fix}, "
                f"or removing those rows if completeness matters more than row count."
            )
        if len(suggestions) >= max_suggestions:
            break

    if len(suggestions) < max_suggestions:
        for col in df.columns:
            if len(suggestions) >= max_suggestions:
                break
            nunique = df[col].nunique(dropna=True)
            if nunique <= 1 and rows > 1:
                suggestions.append(
                    f"'{col}' has the same value in every row — it adds no analytical value; "
                    f"consider removing it or checking whether it was collected correctly."
                )

    if not suggestions:
        suggestions.append(
            "Data quality is excellent — no missing values, no duplicate rows, and no "
            "constant columns detected. No cleanup needed before analysis."
        )

    return suggestions[:max_suggestions]


def analyze_dataframe(df):

    rows = int(len(df))
    columns = int(len(df.columns))

    missing = int(
        df.isnull()
        .sum()
        .sum()
    )

    duplicates = int(
        df.duplicated()
        .sum()
    )

    # MongoDB safe preview
    preview_df = (
        df.head(10)
        .fillna("")
        .astype(str)
    )

    preview = preview_df.to_dict(
        orient="records"
    )

    column_types = {}

    for col in df.columns:

        column_types[
            str(col)
        ] = str(
            df[col].dtype
        )

    score = (
        (
            1 -
            (
                missing +
                duplicates
            ) /
            max(rows, 1)
        )
        * 100
    )

    score = round(
        max(score, 0),
        2
    )

    return {

        "rows": rows,

        "columns": columns,

        "missing_values": missing,

        "duplicates": duplicates,

        "quality_score": float(score),

        "column_names": [
            str(c)
            for c in df.columns
        ],

        "column_types":
            column_types,

        "preview":
            preview,

        "chart_recommendations": [

            "Bar Chart",
            "Line Chart",
            "Pie Chart"

        ],

        "ai_suggestions":
            compute_quality_suggestions(df)
    }