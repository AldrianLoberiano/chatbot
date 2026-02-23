# AI Chatbot

A web-based AI chatbot powered by **Google Gemini 2.5 Flash**, built with Node.js and Express. Supports multiple conversations, chat history, and a clean browser UI.

## Features

- Real-time AI responses via Google Gemini
- Multiple conversations with persistent history
- Auto-generated chat titles from the first message
- Rename and delete conversations
- Guest sessions (no login required)
- Rate-limit retry handling
- Markdown rendering in responses

## Project Structure

```
chatbot/
├── server.js          # Express server & API routes
├── package.json
├── .env               # API keys (not committed)
├── public/
│   ├── index.html
│   ├── chat.html      # Main chat UI
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── auth.js
│       └── chat.js
└── data/
    ├── users.json     # User data
    └── chats/         # Per-user conversation files
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=your_session_secret_here
PORT=3000
```

Get a free Gemini API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 3. Start the server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Endpoint               | Description                        |
| ------ | ---------------------- | ---------------------------------- |
| GET    | `/api/auth/me`         | Get current session user           |
| GET    | `/api/chat/history`    | List all conversations             |
| POST   | `/api/chat/new`        | Create a new conversation          |
| GET    | `/api/chat/:id`        | Get a conversation with messages   |
| POST   | `/api/chat/send`       | Send a message and get AI response |
| PUT    | `/api/chat/:id/rename` | Rename a conversation              |
| DELETE | `/api/chat/:id`        | Delete a conversation              |

## Dependencies

- [express](https://expressjs.com/) — Web framework
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) — Gemini API client
- [express-session](https://www.npmjs.com/package/express-session) — Session management
- [uuid](https://www.npmjs.com/package/uuid) — Unique ID generation
- [dotenv](https://www.npmjs.com/package/dotenv) — Environment variable loading
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) — Password hashing
- [marked](https://www.npmjs.com/package/marked) — Markdown rendering
