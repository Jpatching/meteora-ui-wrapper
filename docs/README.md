# MetaTools Documentation

Welcome to the MetaTools documentation. This directory contains all project documentation organized by category.

## Quick Links

- [Project Instructions for AI Agents](../CLAUDE.md) - **Start here for development**
- [Main README](../README.md) - Project overview and quick start
- [Architecture Overview](#architecture)
- [Development Guides](#guides)
- [Testing Resources](#testing)

## Documentation Structure

### 📋 Core Documentation

Essential architecture and reference materials:

- **[ARCHITECTURE.md](core/ARCHITECTURE.md)** - Comprehensive technical architecture
  - Transaction flow patterns
  - SDK integration approach
  - State management architecture
  - Type system overview

- **[SDK_REFERENCE.md](core/SDK_REFERENCE.md)** - Meteora SDK integration reference
  - SDK method signatures
  - Parameter requirements
  - Return types and responses

### 📚 Development Guides

Step-by-step guides for common development tasks:

- **[DEVNET_TESTING_GUIDE.md](guides/DEVNET_TESTING_GUIDE.md)** - Testing on Solana devnet
  - Wallet setup for testing
  - Airdrop procedures
  - Transaction verification
  - Common devnet issues

- **[ANALYTICS_GUIDE.md](guides/ANALYTICS_GUIDE.md)** - Analytics and tracking system
  - Transaction history tracking
  - Analytics dashboard usage
  - Data export/import
  - Storage management

- **[IMPLEMENTATION_GUIDE.md](guides/IMPLEMENTATION_GUIDE.md)** - Adding new features
  - Protocol action patterns
  - Form component guidelines
  - SDK hook integration
  - UI component usage

- **[PRODUCTION_DEPLOYMENT.md](guides/PRODUCTION_DEPLOYMENT.md)** - Production deployment guide
  - Platform recommendations (Vercel, Netlify, VPS)
  - Environment configuration
  - Security checklist
  - Monitoring and logging
  - Cost estimates and scaling

### 🧪 Testing Documentation

Testing procedures and checklists:

- **[COMPLETE_FORM_TESTING_CHECKLIST.md](testing/COMPLETE_FORM_TESTING_CHECKLIST.md)** - Comprehensive form testing
  - Validation testing
  - Wallet integration tests
  - Transaction submission tests
  - Error handling verification

- **[DLMM_TESTING.md](testing/DLMM_TESTING.md)** - DLMM-specific testing procedures
  - Pool creation testing
  - Liquidity seeding tests
  - Pool management tests

- **[TESTING.md](testing/TESTING.md)** - General testing guidelines
  - Unit test patterns
  - Integration test setup
  - E2E testing approach

### 📊 Current Status

Active implementation summaries and current state:

- **[PHASE_2_IMPLEMENTATION_SUMMARY.md](current/PHASE_2_IMPLEMENTATION_SUMMARY.md)** - Phase 2 features
  - Fee distribution system
  - Referral program
  - Transaction tracking

- **[ANALYTICS_IMPLEMENTATION_SUMMARY.md](current/ANALYTICS_IMPLEMENTATION_SUMMARY.md)** - Analytics implementation
  - TransactionStore details
  - Analytics UI components
  - Data persistence

- **[COMPLETE_IMPLEMENTATION_SUMMARY.md](current/COMPLETE_IMPLEMENTATION_SUMMARY.md)** - Full implementation status
  - Completed features
  - In-progress work
  - Known issues
  - Next steps

- **[IMPLEMENTATION_SUMMARY_2025-11-02.md](current/IMPLEMENTATION_SUMMARY_2025-11-02.md)** - Latest implementation work
  - Documentation organization
  - Slash commands and agents
  - MCP server architecture

- **[ATOMIC_FEES_IMPLEMENTATION_2025-11-02.md](current/ATOMIC_FEES_IMPLEMENTATION_2025-11-02.md)** - Atomic fee fixes
  - 3 DLMM functions fixed
  - Platform fee updates
  - RPC strategy design

### 📦 Archive

Historical status snapshots (for reference only):

- [PROJECT_STATUS.md](archive/PROJECT_STATUS.md)
- [FINAL_STATUS.md](archive/FINAL_STATUS.md)
- [IMPLEMENTATION_STATUS.md](archive/IMPLEMENTATION_STATUS.md)
- [FINAL_IMPLEMENTATION_STATUS.md](archive/FINAL_IMPLEMENTATION_STATUS.md)
- [SDK_INTEGRATION_STATUS.md](archive/SDK_INTEGRATION_STATUS.md)
- [COMPLETION_ROADMAP.md](archive/COMPLETION_ROADMAP.md)
- [SESSION_SUMMARY.md](archive/SESSION_SUMMARY.md)
- [FORMS_COMPLETE.md](archive/FORMS_COMPLETE.md)

---

## Common Development Tasks

### Adding a New Protocol Action

1. Read [IMPLEMENTATION_GUIDE.md](guides/IMPLEMENTATION_GUIDE.md) for the pattern
2. Review [ARCHITECTURE.md](core/ARCHITECTURE.md) for architecture context
3. Check [SDK_REFERENCE.md](core/SDK_REFERENCE.md) for SDK method details
4. Follow the atomic fee pattern (see Phase 3 in current status docs)
5. Test using [DEVNET_TESTING_GUIDE.md](guides/DEVNET_TESTING_GUIDE.md)

### Understanding the Codebase

**For AI Agents:**
- Start with [CLAUDE.md](../CLAUDE.md) - contains all development guidelines and patterns

**For Humans:**
1. Read [Main README](../README.md) for project overview
2. Review [ARCHITECTURE.md](core/ARCHITECTURE.md) for system design
3. Check [COMPLETE_IMPLEMENTATION_SUMMARY.md](current/COMPLETE_IMPLEMENTATION_SUMMARY.md) for current status
4. Browse code examples in `src/lib/meteora/useDLMM.ts` (reference implementation)

### Testing Your Changes

1. Follow [DEVNET_TESTING_GUIDE.md](guides/DEVNET_TESTING_GUIDE.md) for environment setup
2. Use [COMPLETE_FORM_TESTING_CHECKLIST.md](testing/COMPLETE_FORM_TESTING_CHECKLIST.md) for validation
3. Run protocol-specific tests from [DLMM_TESTING.md](testing/DLMM_TESTING.md) or similar

### Understanding Fees & Analytics

- **Fee Distribution:** See [PHASE_2_IMPLEMENTATION_SUMMARY.md](current/PHASE_2_IMPLEMENTATION_SUMMARY.md)
- **Referral System:** See [PHASE_2_IMPLEMENTATION_SUMMARY.md](current/PHASE_2_IMPLEMENTATION_SUMMARY.md)
- **Transaction Tracking:** See [ANALYTICS_IMPLEMENTATION_SUMMARY.md](current/ANALYTICS_IMPLEMENTATION_SUMMARY.md)
- **Analytics UI:** See [ANALYTICS_GUIDE.md](guides/ANALYTICS_GUIDE.md)

---

## Architecture Overview

### Transaction Flow Pattern

```
User Form Input → React Hook (useDLMM, useDAMMv2, etc.)
  → Meteora SDK Method → Build Transaction
  → Prepend Fee Instructions (ATOMIC)
  → sendTransaction (wallet adapter)
  → Confirm with Retry Logic
  → Track in Analytics Store
```

**Key Principle:** Fees must be atomic with the main transaction to prevent loss on transaction failure.

### Tech Stack Summary

- **Framework:** Next.js 16 (App Router)
- **React:** 19.2
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript 5
- **Blockchain:** Solana Web3.js + Meteora SDK
- **Wallet:** Solana Wallet Adapter
- **State:** React Context + localStorage

### File Structure

```
src/
├── app/                    # Next.js pages (protocols: dlmm, damm-v1, damm-v2, dbc, alpha-vault)
├── components/
│   ├── ui/                 # Reusable UI components
│   └── layout/             # Layout components (sidebar, header)
├── contexts/               # React contexts (Network, Referral, TransactionHistory)
├── providers/              # Provider wrappers
├── lib/
│   ├── meteora/            # SDK integration hooks (useDLMM, useDAMMv2, etc.)
│   ├── feeDistribution.ts  # 3-way fee split logic
│   ├── fees.ts             # Basic fee collection
│   ├── referrals.ts        # Referral system
│   ├── transactionStore.ts # Transaction persistence
│   └── transactionUtils.ts # Retry and confirmation logic
└── types/                  # TypeScript definitions
```

---

## Getting Help

### For AI Development Agents

**Primary Resource:** [CLAUDE.md](../CLAUDE.md)

This file contains:
- Complete development guidelines
- Code patterns and best practices
- Transaction handling patterns
- UI component usage
- Git workflow

**Secondary Resources:**
- [ARCHITECTURE.md](core/ARCHITECTURE.md) for deep technical details
- [IMPLEMENTATION_GUIDE.md](guides/IMPLEMENTATION_GUIDE.md) for step-by-step procedures

### For Human Developers

**Getting Started:**
1. Clone repository
2. Read [Main README](../README.md)
3. Review [ARCHITECTURE.md](core/ARCHITECTURE.md)
4. Set up development environment per README
5. Follow [DEVNET_TESTING_GUIDE.md](guides/DEVNET_TESTING_GUIDE.md) for testing

**Questions?**
- Check [COMPLETE_IMPLEMENTATION_SUMMARY.md](current/COMPLETE_IMPLEMENTATION_SUMMARY.md) for current status
- Review code examples in `src/lib/meteora/`
- Consult protocol-specific documentation in `docs/testing/`

---

## Documentation Maintenance

### When to Update Documentation

**Core Documentation** (`docs/core/`):
- Update when architecture changes significantly
- Update SDK reference when Meteora SDK updates
- Keep in sync with major refactors

**Guides** (`docs/guides/`):
- Update when development workflows change
- Add new guides for new development patterns
- Update testing guides when test procedures change

**Current Status** (`docs/current/`):
- Update after completing major features
- Keep implementation summaries current
- Document known issues and next steps

**Archive** (`docs/archive/`):
- Do not modify - historical record only
- Add new snapshots only when archiving current status

### Documentation Style Guide

- Use clear, concise language
- Include code examples for technical concepts
- Link between related documents
- Keep a consistent structure across similar docs
- Update the docs/README.md index when adding new files

---

*Last updated: 2025-11-02*
