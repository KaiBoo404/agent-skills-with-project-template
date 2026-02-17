# Improvement Specifications Index

> Created: 2026-01-02  
> Last Updated: 2026-02-16  
> Status: Active

This directory contains individual improvement specifications for the MyProject project. Each spec is a standalone document with detailed implementation guidance.

---

## 🔴 Critical Priority

### 002 - Fix Async Blocking with .Result
**Impact**: Prevents deadlocks and thread pool starvation  
**Effort**: Minimal (5 minutes)  
**File**: `002-fix-async-blocking-result.md`

**Quick Summary**: Fix `CheckInService.cs` line 652 - replace `.Result` with `await`

---

## 🟠 High Priority

### 001 - Add AsNoTracking() to Read-Only Queries
**Impact**: 20-30% memory reduction, 10-30% faster queries  
**Effort**: Low (1-2 hours)  
**File**: `001-add-asnotracking-readonly-queries.md`

**Quick Summary**: Add `.AsNoTracking()` to Entity Framework queries that don't need change tracking

### 003 - Add Response Compression
**Impact**: 60-80% reduction in response size  
**Effort**: Low (30 minutes)  
**File**: `003-add-response-compression.md`

**Quick Summary**: Enable gzip/brotli compression for JSON responses

### 004 - Fix DI Lifetime Issues
**Impact**: Prevents thread-safety bugs  
**Effort**: Medium (3-4 hours)  
**File**: `004-fix-di-lifetime-issues.md`

**Quick Summary**: Review and fix inconsistent service lifetime registrations

---

## 🟡 Medium Priority

### 005 - Migrate to .NET 9
**Impact**: 20-40% performance improvement, modern features  
**Effort**: Medium (3-5 days)  
**File**: `005-migrate-to-dotnet9.md`

**Quick Summary**: Upgrade from .NET 7 (EOL) to .NET 9. Includes post-migration perf investigation plan for `perf-async.md` and `perf-memory.md` patterns

---

## 📊 Quick Stats

| Priority | Count | Total Effort | Expected Impact |
|----------|-------|--------------|-----------------|
| 🔴 Critical | 2 | 20 minutes | Prevents security breach & deadlocks |
| 🟠 High | 6 | ~1-2 days | Security hardening + 20-80% perf gains |
| 🟡 Medium | 11 | ~3-4 weeks | Long-term reliability & maintainability |
| 🟢 Low | 1 | 30 minutes | Code quality polish |
| **Total** | **20** | **~5-6 weeks** | **Comprehensive improvement** |

---

## 📋 Recommended Implementation Order

### Week 1 — Critical & Quick Security Wins
⚡ **[002] Fix async blocking** — 5 min, prevents deadlocks [✅ DONE]
🚀 **[001] Add AsNoTracking** — 1-2h, immediate perf boost [✅ DONE]
🚀 **[003] Response compression** — 30 min, better mobile experience [✅ DONE]
🔧 **[004] DI lifetime audit** — 3-4h, prevents bugs [✅ DONE]

**Week 1 Total**: ~1 day effort, major security + performance improvement

### Week 2 — Reliability & Monitoring
⬆️ **[005] .NET 9 migration** — 3-5 days, future-proofing + perf investigation [✅ DONE]

**Week 2 Total**: ~3-5 days effort

---

## ✅ Status Tracking

`[ ] Not Started` | `[/] In Progress` | `[x] Completed`

- [x] 001 - Add AsNoTracking() to Read-Only Queries
- [x] 002 - Fix Async Blocking with .Result
- [x] 003 - Add Response Compression
- [x] 004 - Fix DI Lifetime Issues
- [x] 005 - Migrate to .NET 9

---

## 📂 Improvement Categories

| Category | Specs | Key Focus |
|----------|-------|-----------|
| **Security** | 010, 011, 012, 013, 015 | Config leak, auth pipeline, headers, rate limiting |
| **Performance** | 001, 003, 008, 009, 014, 018, 019, 020 | Queries, compression, caching, benchmarking, load testing |
| **Logging & Monitoring** | 006, 010, 015, 018, 019 | Health checks, structured logging, diagnostics, metrics |
| **Reliability** | 002, 004, 011, 016, 020 | Async, DI lifetimes, middleware, config validation, load testing |
| **Testing** | 017, 020 | Unit, integration, architecture, load tests |
| **Modernization** | 005, 007 | .NET 9, API versioning |

---

## 📖 How to Use These Specs

1. **Read the spec** — Each file has detailed problem description and solution
2. **Check prerequisites** — Some specs depend on others
3. **Follow the implementation** — Step-by-step code changes included
4. **Run tests** — Each spec has a testing checklist
5. **Measure results** — Expected performance improvements documented

---

## 📚 Related Documents

- **dotnet-best-practices Skill**: `.context/skills/dotnet-best-practices/`
- **Coding Conventions**: `.context/03_conventions.md`
- **Tech Stack**: `.context/02_tech_stack.md`

---

*Each specification is designed to be implemented independently, though some have recommended sequences for optimal results.*
