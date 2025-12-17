# Interviews - AI-Powered Interview Assistant

An AI-powered interview assistant application that helps solve coding problems using Ollama models.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Ollama installed and running

## Installation Guide

### Step 1: Install Ollama

#### macOS

```bash
brew install ollama
```

#### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows

Download the installer from [ollama.com](https://ollama.com)

### Step 2: Install Ollama Models

After installing Ollama, you need to pull the required models:

```bash
ollama pull deepseek-coder:6.7b
ollama pull llava:7b
```

Verify that the models are installed:

```bash
ollama list
```

### Step 3: Install Dependencies

Install dependencies for both the server and the application:

```bash
# Install server dependencies
cd server
npm install

# Install application dependencies
cd ../app
npm install
```

### Step 4: Start Ollama Server

In a separate terminal, start the Ollama server:

```bash
ollama serve
```

The Ollama server will run on `http://localhost:11434` by default.

Verify that Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## Running the Application

### Start the Node.js Server

Open a terminal and navigate to the server directory:

```bash
cd server
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

### Start the Application

Open another terminal and navigate to the app directory:

```bash
cd app
npm start
```

This will launch the Electron application.

## Usage

1. Make sure Ollama is running (`ollama serve`)
2. Start the Node.js server (`cd server && npm start`)
3. Start the application (`cd app && npm start`)
4. Click "Start Session" in the application
5. Send LeetCode problems or coding questions

## Project Structure

```
interviews/
├── app/          # Electron application (frontend)
├── server/       # Node.js server (backend)
└── README.md     # This file
```

## Troubleshooting

### Ollama server is not available

- Make sure `ollama serve` is running
- Check that port 11434 is not occupied
- Verify Ollama installation: `ollama --version`

### Model not found

- Pull the required models:
  ```bash
  ollama pull deepseek-coder:6.7b
  ollama pull llava:7b
  ```
- Check available models: `ollama list`

### Server connection errors

- Ensure the server is running on port 3000
- Check that no other application is using port 3000
- Verify server logs for error messages

### Application won't start

- Make sure all dependencies are installed (`npm install` in both `app` and `server` directories)
- Check Node.js version: `node --version` (should be v14 or higher)
- Review application logs for specific errors

## Available Models

The application uses the following Ollama models:

- `deepseek-coder:6.7b` - For code generation and problem solving
- `llava:7b` - For vision/image analysis tasks

You can use other models by modifying the configuration in the server code.

## License

GPL-3.0
