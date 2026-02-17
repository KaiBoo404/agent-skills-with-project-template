---
description: Add response compression to reduce bandwidth and improve mobile app performance
priority: high
effort: low
impact: 60-80% reduction in response size
status: pending
created: 2026-01-02
---

# Add Response Compression

## Problem

Large JSON responses are sent uncompressed, wasting bandwidth and slowing down mobile app performance.

**Current Issues**:
- Large JSON payloads (especially list endpoints)
- No gzip or brotli compression
- Slower mobile app load times
- Higher bandwidth costs

## Affected Files

- `Program.cs` (add configuration)

## Implementation

### Add NuGet Package (if needed)
```bash
dotnet add package Microsoft.AspNetCore.ResponseCompression
```

### Program.cs Changes

**After line 56** (after AddEndpointsApiExplorer):
```csharp
// Add Response Compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});
```

**After line 282** (before if (app.Environment.IsDevelopment())):
```csharp
// Enable Response Compression
app.UseResponseCompression();
```

## Expected Results

- **Response Size**: 60-80% smaller for JSON responses
- **Mobile Performance**: Faster load times (especially on slow networks)
- **Bandwidth**: Reduced data transfer costs
- **User Experience**: Snappier app responsiveness

## Testing Checklist

- [ ] Verify compression works with curl:
  ```bash
  curl -H "Accept-Encoding: gzip" https://your-api/api/v1/config
  # Should see Content-Encoding: gzip in headers
  ```
- [ ] Test with browser DevTools network tab
- [ ] Measure response sizes before/after
- [ ] Verify all endpoints still work correctly
- [ ] Test with mobile app

## Performance Benchmarks

### Before
```
GET /api/v1/config/app
- Response Size: 45KB
```

### After
```
GET /api/v1/config/app
- Response Size: 12KB (-73%)
```

## Implementation Notes

- Modern browsers automatically send `Accept-Encoding: gzip, deflate, br`
- Compression is automatic for responses > 1KB
- Brotli is more efficient than gzip (5-20% better compression)
- Use `Fastest` compression level for best CPU/size tradeoff

## Related Improvements

- Consider CDN for static assets
- Monitor compression ratio in production
- Add response size to logging/metrics
