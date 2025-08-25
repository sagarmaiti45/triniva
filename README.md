# AI Chat Platform

A modern, minimalistic AI chatting platform built with Node.js and the OpenRouter API.

## Features

- Clean, modern UI with minimalist design
- Real-time streaming responses
- Support for multiple AI models (Mistral Medium & GPT-4o Mini)
- Session-based conversation history
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Configuration

The API key is securely stored in the `.env` file. Never commit this file to version control.

## Usage

1. Select your preferred AI model from the dropdown
2. Type your message in the input field
3. Press Enter or click the send button
4. Watch as the AI response streams in real-time

## Security

- API key is stored in environment variables
- `.env` file is gitignored for security
- Server-side API calls only (key never exposed to client)

## Technologies

- Node.js & Express
- OpenRouter API
- Server-Sent Events (SSE) for streaming
- Vanilla JavaScript
- Modern CSS with custom properties