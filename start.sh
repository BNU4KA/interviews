#!/bin/bash

set -e

echo "🚀 Starting Interviews project..."

echo "📦 Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install it first:"
    echo "   macOS: brew install ollama"
    echo "   Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo "   Windows: Download from https://ollama.com"
    exit 1
fi

OLLAMA_PID=""
echo "🔍 Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "🔄 Starting Ollama server..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    echo "⏳ Waiting for Ollama to start..."
    sleep 3
    
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama is running (PID: $OLLAMA_PID)"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "❌ Failed to start Ollama. Please start it manually: ollama serve"
            exit 1
        fi
        sleep 1
    done
else
    echo "✅ Ollama is already running"
    OLLAMA_PID=$(pgrep -f "ollama serve" | head -1 || echo "already running")
fi

echo "🔍 Checking required models..."
MODELS=$(ollama list 2>/dev/null || echo "")
if ! echo "$MODELS" | grep -q "deepseek-coder.*6.7b"; then
    echo "📥 Pulling deepseek-coder:6.7b model..."
    ollama pull deepseek-coder:6.7b
else
    echo "✅ deepseek-coder:6.7b is already installed"
fi

if ! echo "$MODELS" | grep -q "llava.*7b"; then
    echo "📥 Pulling llava:7b model..."
    ollama pull llava:7b
else
    echo "✅ llava:7b is already installed"
fi

echo "🌐 Starting Node.js server..."
cd server
npm start > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

echo "⏳ Waiting for server to start..."
sleep 3

for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1 || [ $i -eq 10 ]; then
        break
    fi
    sleep 1
done

echo "✅ Server is running (PID: $SERVER_PID)"

echo "🔍 Checking for existing application instances..."
EXISTING_ELECTRON=$(pgrep -f "electron.*app" || true)
if [ -n "$EXISTING_ELECTRON" ]; then
    echo "⚠️  Found existing Electron processes. Stopping them to prevent database lock errors..."
    pkill -f "electron.*app" || true
    sleep 2
fi

APP_DATA_DIR="$HOME/Library/Application Support/app"
if [ -d "$APP_DATA_DIR" ]; then
    LOCK_FILE="$APP_DATA_DIR/IndexedDB/file__0.indexeddb.leveldb/LOCK"
    if [ -f "$LOCK_FILE" ]; then
        echo "⚠️  Found stale lock file. Removing it..."
        rm -f "$LOCK_FILE"
    fi
fi

echo "🖥️  Starting application..."
cd app
npm start &
APP_PID=$!
cd ..

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📋 Process IDs:"
if [ -n "$OLLAMA_PID" ] && [ "$OLLAMA_PID" != "already running" ]; then
    echo "   Ollama: $OLLAMA_PID"
else
    echo "   Ollama: already running"
fi
echo "   Server: $SERVER_PID"
echo "   App:    $APP_PID"
echo ""
echo "📝 Logs:"
echo "   Server logs: tail -f server.log"
echo ""
echo "🛑 To stop all services, run: pkill -f 'ollama serve|node.*server.js|electron'"
echo ""
echo "💡 The application is now running. Close this terminal or press Ctrl+C to exit."
echo "   (Note: Services will continue running in the background)"
echo ""
