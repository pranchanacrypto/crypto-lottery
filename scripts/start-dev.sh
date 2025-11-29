#!/bin/bash

# Start all services for development
# Run: chmod +x scripts/start-dev.sh && ./scripts/start-dev.sh

echo "🎰 Starting Crypto Lottery Development Environment"
echo "===================================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "⚠️  tmux not found. Starting services in background..."
    echo ""
    
    # Start backend
    echo "Starting backend..."
    cd backend && npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
    
    # Start frontend
    echo "Starting frontend..."
    cd ../frontend && npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
    
    echo ""
    echo "Services running:"
    echo "- Backend: http://localhost:3000 (PID: $BACKEND_PID)"
    echo "- Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
    echo ""
    echo "Logs:"
    echo "- Backend: tail -f logs/backend.log"
    echo "- Frontend: tail -f logs/frontend.log"
    echo ""
    echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
else
    echo "✅ tmux found. Starting in tmux session..."
    echo ""
    
    # Create tmux session
    tmux new-session -d -s crypto-lottery
    
    # Split window
    tmux split-window -h
    
    # Backend in left pane
    tmux select-pane -t 0
    tmux send-keys "cd backend && npm run dev" C-m
    
    # Frontend in right pane
    tmux select-pane -t 1
    tmux send-keys "cd frontend && npm run dev" C-m
    
    echo "✅ Services started in tmux session 'crypto-lottery'"
    echo ""
    echo "To attach: tmux attach -t crypto-lottery"
    echo "To detach: Ctrl+B then D"
    echo "To stop: tmux kill-session -t crypto-lottery"
    echo ""
    
    # Attach to session
    tmux attach -t crypto-lottery
fi

