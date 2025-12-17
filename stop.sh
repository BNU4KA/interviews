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
    sleep 2
    
    REMAINING_ELECTRON=$(pgrep -f "electron.*app\|electron-forge\|@electron-forge" || true)
    if [ -n "$REMAINING_ELECTRON" ]; then
        echo "⚠️  Force killing remaining Electron processes..."
        pkill -9 -f "electron.*app" || true
        pkill -9 -f "electron-forge" || true
        pkill -9 -f "@electron-forge" || true
        sleep 1
    fi
    echo "✅ Application stopped"
else
    echo "ℹ️  No Electron processes found"
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
