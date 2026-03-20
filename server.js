import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// 使用 Google Gemini API
import { GoogleGenerativeAI } from "@google/generative-ai";
// 用於抓取網頁
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files (for Vercel deployment)
app.use(express.static(".", {
  setHeaders: (res, path) => {
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Serve static PNG files explicitly
app.get("/AWE-logo.png", (req, res) => {
  res.sendFile(__dirname + "/AWE-logo.png");
});

app.get("/AWE-icon.png", (req, res) => {
  res.sendFile(__dirname + "/AWE-icon.png");
});

// 初始化 Gemini (使用 .env 中的 GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Interview system prompt - The Interviewer role
const INTERVIEWER_SYSTEM_PROMPT = `
你是一位頂級 AI 設計總監，正在幫助使用者定義網站風格。

你的任務是透過對話收集以下設計資訊：
- 節奏 (rhythm)
- 視覺權重 (hierarchy) 
- 材質光感 (material)
- 空間感 (space)
- 情境 (emotion)
- 互動 (interaction)

規則：
1. 如果使用者的回答模糊抽象 → 一定要追問，請他們用具體畫面或比喻描述
2. 如果回答太短 → 要求多補充一點
3. 一次只問一個問題，不要一次問多個
4. 不要讓使用者跳過任何一個設計維度
5. 問問題要有邏輯順序，先了解整體感覺，再深入細節
6. 當收集足夠資訊後，自動切換到產出階段
7. 使用繁體中文回覆
`;

// Synthesizer system prompt - The Synthesizer role
const SYNTHESIZER_SYSTEM_PROMPT = `
你是一位頂級 UI/UX 設計專家。

請根據以下訪談內容，產出三種截然不同的設計方向。

訪談內容：
{answers}

請產出：
1. 三種「明確不同」的設計方向
2. 每種包含：
   - layout 結構 (版面配置)
   - 視覺語言 (色彩、字體、圖像風格)
   - 動效設計 (過渡、動畫、反饋)
3. 避免：
   - 典型 SaaS 風格
   - 卡片式 UI
   - 三欄式 layout
   - 任何模板化設計

輸出要具體到可以直接拿來做 UI。

使用繁體中文回覆。
`;

// In-memory conversation storage (per session)
let conversationHistory = [];
let collectedAnswers = {};
let projectContext = "";

// Set project context
app.post("/context", async (req, res) => {
  try {
    projectContext = req.body.context || "";
    console.log("📁 Project context updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "無法設定專案背景" });
  }
});

// 抓取網頁內容
async function fetchUrlContent(url) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      httpsAgent: new (require('https').Agent)({  
        rejectUnauthorized: false
      })
    });
    
    const $ = cheerio.load(response.data);
    
    // 移除不需要的元素
    $('script, style, nav, footer, header, aside, ads, iframe').remove();
    
    // 取得標題
    const title = $('title').text() || $('h1').first().text() || '';
    
    // 取得主要文字內容
    let content = '';
    $('main, article, .content, .main, #content').each((i, el) => {
      content += $(el).text() + ' ';
    });
    
    // 如果沒有抓到主要內容，就抓 body
    if (content.trim().length < 50) {
      content = $('body').text();
    }
    
    // 清理文字
    content = content.replace(/\s+/g, ' ').trim().substring(0, 3000);
    
    return {
      title: title.trim(),
      content: content,
      url: url
    };
  } catch (error) {
    console.error("URL fetch error:", error.message);
    return null;
  }
}

// 檢測訊息中是否包含 URL
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex);
  return matches ? matches.map(u => u.replace(/[.,;)$]+$/, '')) : [];
}

async function callGemini(systemPrompt, messages, temperature = 0.7) {
  // Gemini 2.0 flash 支援 URL 理解，直接傳遞給 AI
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  // Build conversation history with proper format for Gemini
  const contents = [];
  
  for (const msg of messages) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    });
  }
  
  const result = await model.generateContent({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    generationConfig: {
      temperature: temperature
    }
  });
  
  const response = result.response;
  return response.text();
}

app.post("/chat", async (req, res) => {
  try {
    let userMessage = req.body.message;
    
    if (!userMessage || userMessage.trim() === "") {
      return res.status(400).json({ error: "訊息不能為空" });
    }

    // 檢測訊息中是否包含 URL
    const urls = extractUrls(userMessage);
    if (urls.length > 0) {
      const urlInfo = await fetchUrlContent(urls[0]);
      if (urlInfo) {
        userMessage = `【使用者提供網址分析】\n網址：${urlInfo.url}\n網站標題：${urlInfo.title}\n網站內容：${urlInfo.content}\n\n---\n\n使用者說：${userMessage}`;
      }
    }

    conversationHistory.push({ role: "user", content: userMessage });

    // Check if we have collected enough information
    const hasEnoughInfo = conversationHistory.length >= 4; // At least 4 exchanges with context
    
    // Determine if we should continue interviewing or generate output
    const shouldGenerate = hasEnoughInfo && (
      userMessage.includes("完成") || 
      userMessage.includes("可以了") ||
      userMessage.includes("夠了") ||
      userMessage.includes("結束") ||
      userMessage.includes("產出")
    );

    let reply;
    
    if (shouldGenerate) {
      // Build context string for synthesizer
      const contextSection = projectContext 
        ? `\n\n【專案背景】\n${projectContext}` 
        : "";
      
      // Switch to Synthesizer mode
      reply = await callGemini(
        SYNTHESIZER_SYSTEM_PROMPT.replace(
          "{answers}",
          JSON.stringify(conversationHistory, null, 2) + contextSection
        ),
        [],
        0.8
      );
      
      // Clear conversation after generating
      conversationHistory = [];
      
      return res.json({ 
        reply: reply,
        done: true
      });
    }

    // Build context-aware system prompt
    let systemPromptWithContext = INTERVIEWER_SYSTEM_PROMPT;
    if (projectContext) {
      systemPromptWithContext = INTERVIEWER_SYSTEM_PROMPT.replace(
        "你是一位頂級 AI 設計總監，正在幫助使用者定義網站風格。",
        `你是一位頂級 AI 設計總監，正在幫助使用者定義網站風格。

【專案背景資訊】
${projectContext}

請根據以上專案背景來提問，讓問題更加針對性。`
      );
    }

    // Continue interviewing
    reply = await callGemini(systemPromptWithContext, conversationHistory, 0.7);
    conversationHistory.push({ role: "assistant", content: reply });

    res.json({ 
      reply: reply,
      done: false
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "伺服器發生錯誤，請稍後再試" });
  }
});

// Reset conversation
app.post("/reset", async (req, res) => {
  conversationHistory = [];
  collectedAnswers = {};
  projectContext = "";
  res.json({ success: true });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Using: Google Gemini 2.5 Flash`);
  console.log(`📝 Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`🔄 Reset endpoint: http://localhost:${PORT}/reset`);
});
