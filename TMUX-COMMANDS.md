# tmux Quick Start Commands

## Copy-Paste Ready Commands for Your Setup

### Option 1: Manual Setup (Recommended)

```bash
# Create new tmux session
tmux new -s meteora

# You're now in Window 0 - Start Docker
docker compose up

# Create Window 1 (Ctrl+b, then press 'c')
# Then run:
npm run dev

# Create Window 2 (Ctrl+b, then press 'c')
# Then run:
docker compose logs -f backend

# Create Window 3 (Ctrl+b, then press 'c')
# This is your shell for git/commands

# Navigate between windows:
# Ctrl+b, 0  -> Go to window 0 (Docker)
# Ctrl+b, 1  -> Go to window 1 (Frontend)
# Ctrl+b, 2  -> Go to window 2 (Logs)
# Ctrl+b, 3  -> Go to window 3 (Shell)

# Detach (keeps everything running):
# Ctrl+b, d

# Reattach later:
tmux attach -t meteora
```

---

### Option 2: Automated Script

Save this as `start-dev.sh`:

```bash
#!/bin/bash
# start-dev.sh - Automated tmux setup for Meteora development

SESSION="meteora"

# Create session with first window
tmux new-session -d -s $SESSION -n "docker"

# Window 0: Docker services
tmux send-keys -t $SESSION:0 "docker compose up" C-m

# Window 1: Frontend dev server
tmux new-window -t $SESSION:1 -n "frontend"
tmux send-keys -t $SESSION:1 "npm run dev" C-m

# Window 2: Backend logs
tmux new-window -t $SESSION:2 -n "logs"
tmux send-keys -t $SESSION:2 "docker compose logs -f backend" C-m

# Window 3: Shell for commands
tmux new-window -t $SESSION:3 -n "shell"

# Select window 1 (frontend) by default
tmux select-window -t $SESSION:1

# Attach to session
tmux attach-session -t $SESSION
```

Make it executable and run:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

---

### Option 3: Split Panes (Single Window)

```bash
# Create session
tmux new -s meteora

# Split horizontally (top/bottom)
# Ctrl+b, "

# Split right pane vertically (left/right)
# Ctrl+b, %

# Navigate panes:
# Ctrl+b, arrow keys

# Layout:
# ┌─────────────────────────────┐
# │  Pane 0: docker compose up  │
# ├──────────────┬──────────────┤
# │  Pane 1:     │  Pane 2:     │
# │  npm run dev │  logs/shell  │
# └──────────────┴──────────────┘

# In pane 0 (top):
docker compose up

# Switch to pane 1 (Ctrl+b, arrow down, arrow left):
npm run dev

# Switch to pane 2 (Ctrl+b, arrow right):
docker compose logs -f backend
```

---

## tmux Cheat Sheet

### Session Management
```bash
tmux new -s meteora          # Create new session named "meteora"
tmux ls                      # List all sessions
tmux attach -t meteora       # Attach to session "meteora"
tmux kill-session -t meteora # Kill session "meteora"
```

### Window Management (Ctrl+b, then...)
```
c        # Create new window
n        # Next window
p        # Previous window
0-9      # Go to window number
,        # Rename current window
&        # Kill current window
```

### Pane Management (Ctrl+b, then...)
```
"        # Split horizontally (top/bottom)
%        # Split vertically (left/right)
arrow    # Navigate between panes
x        # Kill current pane
z        # Toggle pane zoom (fullscreen)
{        # Swap pane left
}        # Swap pane right
```

### General (Ctrl+b, then...)
```
d        # Detach from session
?        # Show all keybindings
:        # Enter command mode
```

---

## Service URLs

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:4000        |
| PostgreSQL | postgresql://localhost:5432  |
| Redis      | redis://localhost:6379       |

---

## Quick Health Checks

```bash
# Check all Docker services
docker compose ps

# Test backend
curl http://localhost:4000/health

# Test frontend
curl http://localhost:3000

# Check ports
lsof -i :3000    # Frontend
lsof -i :4000    # Backend
lsof -i :5432    # PostgreSQL
lsof -i :6379    # Redis
```

---

## Stopping Everything

### From within tmux
```bash
# In Docker window (Window 0): Ctrl+C
# In Frontend window (Window 1): Ctrl+C
# In Logs window (Window 2): Ctrl+C

# Then stop Docker services:
docker compose down
```

### From outside tmux
```bash
# Kill tmux session (stops all windows)
tmux kill-session -t meteora

# Stop Docker services
docker compose down
```

---

## Pro Tips

1. **Always use tmux** - Keeps everything running even if terminal closes
2. **Name your windows** - Easier to navigate (Ctrl+b, ,)
3. **Use Ctrl+b, z** - Zoom into a pane for better visibility
4. **Mouse mode** - Add to `~/.tmux.conf`:
   ```bash
   set -g mouse on
   ```
   Then restart tmux or run: `tmux source-file ~/.tmux.conf`

5. **Status bar** - Shows window names at bottom
6. **Copy mode** - Ctrl+b, [ to scroll/copy text

---

## Workflow

**Morning:**
```bash
tmux attach -t meteora  # Everything is still running!
# OR if session was killed:
./start-dev.sh
```

**During development:**
- Window 0: Monitor Docker logs
- Window 1: Watch frontend hot-reload
- Window 2: Check backend API logs
- Window 3: Run git commands, tests, etc.

**Evening:**
```bash
# Just detach - keeps running!
Ctrl+b, d

# OR stop everything:
tmux kill-session -t meteora
docker compose down
```

---

Happy coding! 🚀
