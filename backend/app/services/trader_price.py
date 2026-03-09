# -*- coding: utf-8 -*-
"""Price calculation for trader: final_price = purchase_price * (1 + markup/100).
Markup priority: item > category > supplier > default."""

from __future__ import annotations

from typing import Optional


def compute_final_price(
    purchase_price: float | None,
    item_markup: float | None,
    category_markup: float | None,
    supplier_markup: float | None,
    default_markup: float | None,
) -> tuple[float | None, float | None]:
    """
    Compute final price and effective markup percent.
    Returns (final_price, effective_markup_percent).
    Markup priority: item > category > supplier > default.
    """
    if purchase_price is None or purchase_price <= 0:
        return None, item_markup
    markup = item_markup
    if markup is None:
        markup = category_markup
    if markup is None:
        markup = supplier_markup
    if markup is None:
        markup = default_markup
    if markup is None:
        markup = 0.0
    try:
        m = float(markup)
    except (TypeError, ValueError):
        m = 0.0
    final = purchase_price * (1 + m / 100.0)
    return round(final, 2), m
