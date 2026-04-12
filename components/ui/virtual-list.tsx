"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * VirtualList — lightweight windowed list for long feeds.
 *
 * Only renders items visible in the viewport + overscan buffer.
 * Uses IntersectionObserver for efficient scroll tracking.
 *
 * Inspired by: Twitter/X infinite scroll, Discord message list,
 * TanStack Virtual's windowing approach.
 *
 * Usage:
 *   <VirtualList
 *     items={feedItems}
 *     itemHeight={80}
 *     renderItem={(item, index) => <FeedCard key={item.id} {...item} />}
 *   />
 */

interface VirtualListProps<T> {
  items: T[];
  /** Estimated height of each item in pixels */
  itemHeight: number;
  /** Number of extra items to render above/below viewport */
  overscan?: number;
  /** Render function for each visible item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional className for the scroll container */
  className?: string;
  /** Optional callback when scrolled near the bottom (infinite scroll) */
  onEndReached?: () => void;
  /** Pixels from bottom to trigger onEndReached */
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = "",
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const onEndReachedRef = useRef(onEndReached);

  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    setContainerHeight(el.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);

    // Infinite scroll trigger
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < endReachedThreshold) {
      onEndReachedRef.current?.();
    }
  }, [endReachedThreshold]);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - overscan,
  );
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(items[i], i)}
      </div>,
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ position: "relative" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems}
      </div>
    </div>
  );
}
