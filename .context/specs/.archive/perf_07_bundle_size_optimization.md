# Bundle Size Optimization

**Priority:** 🟢 Low  
**Impact:** Faster app startup (15-20%)  
**Effort:** High  
**Status:** Not Started

## Objective

Reduce JavaScript bundle size to improve app startup time and installation size.

## Analysis Tools

```bash
# Generate bundle visualization
npx react-native-bundle-visualizer

# Android bundle size
cd android && ./gradlew bundleRelease

# iOS bundle size
# Check in Xcode after archive
```

## Large Dependencies Identified

1. **native-base** (v3.4.28)
   - Check if actually needed - many components unused
   - Consider removing or using selectively
   - Alternative: Use only react-native-paper (already installed)

2. **lodash** (v4.17.15)
   - Currently imported as full library
   - Switch to tree-shakeable imports

3. **Multiple icon libraries**
   - react-native-vector-icons
   - Consider consolidating

## Optimization Strategies

### 1. Tree-shakeable Lodash

```typescript
// ❌ BAD - Imports entire lodash library (~70KB)
import { isEmpty, map, filter } from 'lodash'

// ✅ GOOD - Tree-shakeable imports
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import filter from 'lodash/filter'

// Or use lodash-es
npm install lodash-es
import { isEmpty } from 'lodash-es'
```

### 2. Remove Unused Dependencies

Review package.json for unused packages:
- `native-base` - check usage
- `react-native-url-polyfill` - may not be needed
- Others as identified

### 3. Code Splitting with React.lazy

```typescript
// Lazy load rarely used screens
const TrainingDetailPage = React.lazy(() => 
  import('./TrainingDetailPage')
)

<Suspense fallback={<LoadingView />}>
  <TrainingDetailPage />
</Suspense>
```

## Implementation Steps

1. Run bundle visualizer
2. Identify top 10 largest dependencies
3. For each:
   - Check if actually used (grep search)
   - Find alternative or optimize imports
   - Remove if unused
4. Re-run analyzer, compare before/after

## Target Files

Search for lodash imports:
```bash
rg "from 'lodash'" src/
# Then replace with individual imports
```

## Verification

- App builds successfully
- No runtime errors
- Bundle size reduced (check with visualizer)
- Startup time improved (measure with performance profiler)

## Expected Results

- **Lodash optimization:** ~50KB reduction
- **Remove unused deps:** Variable (10-100KB each)
- **Total target:** 200-500KB bundle size reduction
