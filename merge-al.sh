#!/bin/bash
#
# Safe AL Branch Merge Script
# Automates the merge process with safety checks
#

set -e  # Exit on error

echo "🌊 MetaTools: Safe AL Branch Merge"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}❌ Error: Not on main branch${NC}"
  echo "   Current branch: $CURRENT_BRANCH"
  echo "   Please checkout main first: git checkout main"
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
  echo "   Please commit or stash them first"
  git status --short
  exit 1
fi

echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
echo ""

# Create backup branch
echo -e "${BLUE}📦 Creating backup branch...${NC}"
BACKUP_BRANCH="backup-main-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo -e "${GREEN}✅ Backup created: $BACKUP_BRANCH${NC}"
echo ""

# Fetch latest
echo -e "${BLUE}📡 Fetching latest from origin...${NC}"
git fetch origin
echo ""

# Create merge branch
echo -e "${BLUE}🌿 Creating merge branch...${NC}"
MERGE_BRANCH="merge-al-ui-enhancements"
git checkout -b "$MERGE_BRANCH"
echo -e "${GREEN}✅ Created branch: $MERGE_BRANCH${NC}"
echo ""

# Attempt merge
echo -e "${BLUE}🔀 Attempting to merge origin/AL...${NC}"
echo ""

if git merge origin/AL --no-commit --no-ff; then
  echo -e "${GREEN}✅ Merge successful (no conflicts)${NC}"
  MERGE_STATUS="clean"
else
  echo -e "${YELLOW}⚠️  Merge has conflicts${NC}"
  MERGE_STATUS="conflicts"
fi

echo ""
echo -e "${BLUE}📊 Merge Summary:${NC}"
git diff --cached --stat
echo ""

if [ "$MERGE_STATUS" = "conflicts" ]; then
  echo -e "${YELLOW}⚠️  CONFLICTS DETECTED${NC}"
  echo ""
  echo "Conflicted files:"
  git diff --name-only --diff-filter=U
  echo ""
  echo "Next steps:"
  echo "1. Resolve conflicts manually"
  echo "2. Run: git add <resolved-files>"
  echo "3. Run: bash merge-al-fix.sh  (applies critical fixes)"
  echo "4. Test thoroughly"
  echo "5. Run: git commit"
  echo ""
  echo "To abort: git merge --abort && git checkout main"
  exit 0
fi

echo -e "${GREEN}🎉 Merge completed without conflicts!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Do not commit yet!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: bash merge-al-fix.sh  (applies critical fixes)"
echo "2. Review changes: git diff --cached"
echo "3. Test thoroughly: npm run dev"
echo "4. If satisfied: git commit"
echo "5. Merge to main: git checkout main && git merge $MERGE_BRANCH"
echo ""
echo "To abort: git merge --abort && git checkout main"
echo ""
echo -e "${BLUE}Backup branch available: $BACKUP_BRANCH${NC}"
