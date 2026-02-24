const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Gemini Setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY22 ";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Retry helper — retries once after a delay on 429 rate-limit
async function sendWithRetry(chat, message, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await chat.sendMessage(message);
        } catch (err) {
            const isRateLimit = err.status === 429 || err.message?.includes("RESOURCE_EXHAUSTED");
            if (isRateLimit && attempt < retries) {
                const wait = attempt * 10000; // 10s, 20s ...
                console.warn(`Rate limited — retrying in ${wait / 1000}s (attempt ${attempt}/${retries})`);
                await new Promise((r) => setTimeout(r, wait));
            } else {
                throw err;
            }
        }
    }
}

// --- Data directories ---
const DATA_DIR = path.join(__dirname, "data");
const CHATS_DIR = path.join(DATA_DIR, "chats");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR, { recursive: true });

// --- Helpers ---
function getChatFilePath(userId, chatId) {
    return path.join(CHATS_DIR, `${userId}_${chatId}.json`);
}
function getUserChats(userId) {
    const files = fs.readdirSync(CHATS_DIR).filter((f) => f.startsWith(userId + "_"));
    return files.map((f) => {
        const data = JSON.parse(fs.readFileSync(path.join(CHATS_DIR, f), "utf-8"));
        return { id: data.id, title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt };
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "gemini-chatbot-secret-key-2024",
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
);

// --- Auto-guest middleware ---
function ensureGuest(req, res, next) {
    if (!req.session.user) {
        req.session.user = {
            id: uuidv4(),
            username: "Guest",
            provider: "guest",
        };
    }
    next();
}

app.use("/api/chat", ensureGuest);

// Get current user info
app.get("/api/auth/me", ensureGuest, (req, res) => {
    res.json({ user: req.session.user });
});

// ========================
//  CHAT ROUTES
// ========================

// List conversations
app.get("/api/chat/history", (req, res) => {
    const chats = getUserChats(req.session.user.id);
    res.json({ chats });
});

// New conversation
app.post("/api/chat/new", (req, res) => {
    const chatId = uuidv4();
    const chat = {
        id: chatId,
        userId: req.session.user.id,
        title: "New Chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(getChatFilePath(req.session.user.id, chatId), JSON.stringify(chat, null, 2), "utf-8");
    res.json({ chat: { id: chat.id, title: chat.title, createdAt: chat.createdAt, updatedAt: chat.updatedAt } });
});

// Get conversation
app.get("/api/chat/:id", (req, res) => {
    const filePath = getChatFilePath(req.session.user.id, req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Chat not found" });
    const chat = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json({ chat });
});

// Delete conversation
app.delete("/api/chat/:id", (req, res) => {
    const filePath = getChatFilePath(req.session.user.id, req.params.id);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
});

// Send message
app.post("/api/chat/send", async (req, res) => {
    try {
        const { chatId, message } = req.body;
        if (!chatId || !message) return res.status(400).json({ error: "chatId and message are required" });

        const filePath = getChatFilePath(req.session.user.id, chatId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Chat not found" });

        const chatData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        chatData.messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

        const geminiHistory = chatData.messages
            .filter((m) => m.role === "user" || m.role === "model")
            .slice(0, -1)
            .map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
            }));

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "You are a helpful, friendly AI assistant. Respond clearly and concisely. Use markdown formatting when appropriate." }] },
                { role: "model", parts: [{ text: "I understand! I'm a helpful, friendly AI assistant. I'll respond clearly and concisely using markdown formatting when appropriate. How can I help you today?" }] },
                ...geminiHistory,
            ],
        });

        const result = await sendWithRetry(chat, message);
        const responseText = result.response.text();

        chatData.messages.push({ role: "model", content: responseText, timestamp: new Date().toISOString() });

        if (chatData.title === "New Chat" && chatData.messages.length >= 2) {
            chatData.title = message.length > 40 ? message.substring(0, 40) + "..." : message;
        }

        chatData.updatedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), "utf-8");

        res.json({ response: responseText, title: chatData.title });
    } catch (err) {
        console.error("Gemini error:", err);
        let userMessage = "Failed to get AI response. Please try again.";
        if (err.status === 401 || err.message?.includes("API_KEY_INVALID")) {
            userMessage = "Invalid Gemini API key. Please check your key in server.js.";
        } else if (err.status === 429 || err.message?.includes("RESOURCE_EXHAUSTED")) {
            userMessage = "Rate limit reached. Please wait a moment and try again.";
        } else if (err.status === 503 || err.message?.includes("UNAVAILABLE")) {
            userMessage = "Gemini is temporarily unavailable. Please try again shortly.";
        }
        res.status(500).json({ error: userMessage });
    }
});

// Rename conversation
app.put("/api/chat/:id/rename", (req, res) => {
    const filePath = getChatFilePath(req.session.user.id, req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Chat not found" });
    const chatData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    chatData.title = req.body.title || chatData.title;
    chatData.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), "utf-8");
    res.json({ success: true });
});

// --- Pages ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "chat.html")));

app.listen(PORT, () => {
    console.log(`\n🤖 AI Chatbot Server running at http://localhost:${PORT}\n`);
});
