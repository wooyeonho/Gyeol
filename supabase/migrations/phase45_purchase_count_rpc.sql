-- Atomic increment for market item purchase count.
-- Called from app/api/market/purchase/route.ts to prevent race conditions
-- on concurrent purchases (currently falls back to non-atomic update).
CREATE OR REPLACE FUNCTION increment_purchase_count(p_item_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE market_items SET purchase_count = COALESCE(purchase_count, 0) + 1 WHERE id = p_item_id;
$$;
