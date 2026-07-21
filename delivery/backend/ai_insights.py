import os
import re
import requests
from dotenv import load_dotenv

from analysis import compute_insight_facts

load_dotenv()


def _facts_from_dataframe(df):
    try:
        facts = compute_insight_facts(df)
        return facts if facts else None
    except Exception:
        return None


def _fallback_facts(dataset):
    # Used only if we couldn't re-read the original file from disk — keeps
    # the endpoint working, just with less specific numbers.
    facts = [
        f"Dataset contains {dataset.get('columns', '—')} columns and {dataset.get('rows', '—')} rows."
    ]
    missing = dataset.get("missing_values")
    rows = dataset.get("rows") or 0
    if missing is not None and rows:
        pct = round((missing / (rows * max(dataset.get("columns", 1), 1))) * 100, 1)
        facts.append(f"Missing values are at {pct}% of all cells.")
    duplicates = dataset.get("duplicates")
    if duplicates:
        facts.append(f"{duplicates} duplicate rows were found.")
    quality = dataset.get("quality_score")
    if quality is not None:
        facts.append(f"Overall data quality score is {quality}%.")
    return facts


def _polish_with_ai(facts):
    """
    Sends the already-computed, numerically grounded facts to the LLM purely
    to rephrase them as natural sentences — the model is not asked to invent
    any numbers, so the output stays accurate even if the model is uncertain
    about the domain. Falls back to the raw facts on any failure.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return facts

    numbered = "\n".join(f"{i+1}. {f}" for i, f in enumerate(facts))
    prompt = f"""Rewrite each of these data facts as one short, natural, human-friendly sentence.

Rules:
- Output exactly {len(facts)} lines, one rewritten sentence per fact, in the same order.
- Do not add, remove, invent, or change any number, percentage, or name from the original fact.
- Do not add bullets, numbering, markdown, or commentary — just the plain sentences, one per line.
- Keep each sentence under 20 words.

Facts:
{numbered}
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body = {
        "model": os.getenv("OPENROUTER_MODEL"),
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.3,
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=30,
        )
        result = response.json()
        content = result["choices"][0]["message"]["content"]

        lines = [
            re.sub(r"^[\s]*[\d]+[.)]\s*|^[-•*]\s*", "", line).strip()
            for line in content.strip().split("\n")
        ]
        lines = [l for l in lines if l]

        # Only trust the AI's phrasing if it returned a sane, same-sized list —
        # otherwise stick with the deterministic facts rather than risk a
        # mismatched or hallucinated line count.
        if len(lines) == len(facts):
            return lines
        return facts

    except Exception:
        return facts


async def generate_insights(dataset, df=None):
    facts = _facts_from_dataframe(df) if df is not None else None
    if not facts:
        facts = _fallback_facts(dataset)

    insights = _polish_with_ai(facts)

    return {
        "insights": insights
    }
