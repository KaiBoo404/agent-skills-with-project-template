# Progressive Loading for Long Lists

**Priority:** 🟡 Medium  
**Impact:** Faster initial load, lower memory  
**Effort:** Medium (requires API changes)  
**Status:** Not Started

## Objective

Implement pagination/infinite scroll for lists that load 50+ items at once to improve initial render time and reduce memory usage.

## Current Issues

- `AnnouncementPage`: Loads 100 items at once (`ANNOUNCEMENT_PAGE_LIMIT = 100`)
- Various other pages load all data upfront
- Slow initial load on low-end devices
- High memory usage for long lists

## Implementation Pattern

```typescript
const ITEMS_PER_PAGE = 20

const MyListPage = () => {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const newItems = await fetchItems(page, ITEMS_PER_PAGE)
    setItems(prev => [...prev, ...newItems])
    setHasMore(newItems.length === ITEMS_PER_PAGE)
    setPage(p => p + 1)
    setLoading(false)
  }, [page, loading, hasMore])
  
  useEffect(() => {
    loadMore()
  }, [])
  
  return (
    <FlatList
      data={items}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <LoadingSpinner /> : null}
    />
  )
}
```

## Target Pages

**High-priority (load 50+ items):**
1. `src/modules/announcement/pages/AnnouncementPage/index.tsx` (100 items)
2. `src/modules/inbox/pages/MyRequestPage/index.tsx`
3. `src/modules/inbox/pages/HistoryPage/index.tsx`
4. `src/modules/leave/components/Summary/HistoryTab/index.tsx`
5. `src/modules/overtime/components/Summary/HistoryTab/index.tsx`

## Backend Requirements

APIs must support pagination parameters:
- `page` (or `offset`)
- `limit` (or `pageSize`)
- Return `totalCount` or `hasMore` flag

Check with backend team if APIs support this pattern.

## Alternative: Virtual Scrolling

If backend doesn't support pagination, consider:
- Load all data but use FlatList's built-in windowing
- Ensure proper `getItemLayout` is set
- Use `windowSize` prop effectively

## Verification

- Initial load < 1 second
- Smooth scroll performance
- Proper loading indicator at bottom
- No duplicate items
- Test network failure scenarios

## Notes

- Combine with FlatList optimization props for best results
- Consider pull-to-refresh for better UX
- Handle race conditions (user scrolls very fast)
