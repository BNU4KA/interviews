#!/bin/bash

echo "🛑 Stopping all Interviews project services..."

echo "🔍 Checking for running processes..."

OLLAMA_PIDS=$(pgrep -f "ollama serve" || true)
SERVER_PIDS=$(pgrep -f "node.*server.js" || true)
ELECTRON_PIDS=$(pgrep -f "electron.*app" || true)

if [ -n "$OLLAMA_PIDS" ]; then
    echo "🔄 Stopping Ollama processes..."
    pkill -f "ollama serve" || true
    sleep 1
    echo "✅ Ollama stopped"
else
    echo "ℹ️  No Ollama processes found"
fi

if [ -n "$SERVER_PIDS" ]; then
    echo "🔄 Stopping Node.js server processes..."
    pkill -f "node.*server.js" || true
    sleep 1
    echo "✅ Server stopped"
else
    echo "ℹ️  No server processes found"
fi

if [ -n "$ELECTRON_PIDS" ]; then
    echo "🔄 Stopping Electron application processes..."
    pkill -f "electron.*app" || true
    pkill -f "Electron.*app" || true
    pkill -f "electron-forge" || true
    pkill -f "@electron-forge" || true
    pkill -f "Electron Helper.*app" || true
    sleep 2
    
    REMAINING_ELECTRON=$(pgrep -f "electron.*app\|electron-forge\|@electron-forge\|Electron Helper.*app" || true)
    if [ -n "$REMAINING_ELECTRON" ]; then
        echo "⚠️  Force killing remaining Electron processes..."
        pkill -9 -f "electron.*app" || true
        pkill -9 -f "Electron.*app" || true
        pkill -9 -f "electron-forge" || true
        pkill -9 -f "@electron-forge" || true
        pkill -9 -f "Electron Helper.*app" || true
        
        ELECTRON_BY_PID=$(ps aux | grep -E "interviews.*electron|app.*Electron Helper" | grep -v grep | awk '{print $2}' || true)
        if [ -n "$ELECTRON_BY_PID" ]; then
            echo "⚠️  Killing Electron processes by PID..."
            echo "$ELECTRON_BY_PID" | xargs kill -9 2>/dev/null || true
        fi
        sleep 1
    fi
    echo "✅ Application stopped"
else
    echo "ℹ️  No Electron processes found"
fi

echo "🔍 Final cleanup: checking for any Electron processes related to the app..."
for i in {1..5}; do
    FINAL_CHECK=$(ps aux | grep -E "interviews.*electron|app.*Electron Helper|user-data-dir.*app" | grep -v grep | grep -v "Visual Studio Code" | grep -v "Discord" | grep -v "Obsidian" | grep -v "Cursor" || true)
    if [ -n "$FINAL_CHECK" ]; then
        if [ $i -eq 1 ]; then
            echo "⚠️  Found additional Electron processes, force killing (attempt $i)..."
        else
            echo "⚠️  Processes respawned, killing again (attempt $i)..."
        fi
        
        PIDS=$(echo "$FINAL_CHECK" | awk '{print $2}')
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        
        PARENT_PIDS=$(echo "$FINAL_CHECK" | awk '{print $3}' | sort -u | grep -v "^1$" | grep -v "^0$" || true)
        for PPID in $PARENT_PIDS; do
            PARENT_CMD=$(ps -p $PPID -o comm= 2>/dev/null || true)
            if [ -n "$PARENT_CMD" ]; then
                if echo "$PARENT_CMD" | grep -qE "node|electron|npm|zsh|bash"; then
                    PARENT_FULL=$(ps -p $PPID -o args= 2>/dev/null || true)
                    if echo "$PARENT_FULL" | grep -qE "interviews|electron|server\.js"; then
                        echo "   Killing parent process $PPID ($PARENT_CMD)..."
                        kill -9 $PPID 2>/dev/null || true
                    fi
                fi
            fi
        done
        
        sleep 2
    else
        break
    fi
done

FINAL_CHECK=$(ps aux | grep -E "interviews.*electron|app.*Electron Helper|user-data-dir.*app" | grep -v grep | grep -v "Visual Studio Code" | grep -v "Discord" | grep -v "Obsidian" | grep -v "Cursor" || true)
if [ -n "$FINAL_CHECK" ]; then
    echo "⚠️  Warning: Some processes are still running after 5 attempts."
    echo "   They may be managed by another process or system service."
    echo "   Remaining processes:"
    echo "$FINAL_CHECK" | awk '{print "   PID", $2, "-", $11, $12, $13}'
    echo ""
    echo "   To manually kill them, run:"
    echo "$FINAL_CHECK" | awk '{print "   kill -9", $2}'
else
    echo "✅ All Electron processes stopped successfully!"
fi

echo ""
echo "🔍 Checking for any remaining processes..."

REMAINING=$(ps aux | grep -E "ollama serve|node.*server\.js|electron.*app|electron-forge" | grep -v grep | grep -v "Visual Studio Code" || true)

if [ -n "$REMAINING" ]; then
    echo "⚠️  Found remaining processes:"
    echo "$REMAINING"
    echo ""
    echo "💡 To force kill, run:"
    echo "   pkill -9 -f 'ollama serve'"
    echo "   pkill -9 -f 'node.*server.js'"
    echo "   pkill -9 -f 'electron.*app'"
else
    echo "✅ All processes stopped successfully!"
fi

echo ""
echo "🧹 Cleaning up lock files..."

APP_DATA_DIR="$HOME/Library/Application Support/app"
if [ -d "$APP_DATA_DIR" ]; then
    LOCK_FILE="$APP_DATA_DIR/IndexedDB/file__0.indexeddb.leveldb/LOCK"
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
        echo "✅ Removed stale lock file"
    else
        echo "ℹ️  No lock file found"
    fi
else
    echo "ℹ️  Application data directory not found"
fi

echo ""
echo "✨ Done!"
