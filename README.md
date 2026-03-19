# AI Design Director V3

AI 驅動的網站風格定義系統，幫助你透過對話產生專業的設計方向。

## 功能特色

- 🤖 **AI Interviewer** - 智慧型訪談，引導你定義網站風格
- 🎨 **AI Synthesizer** - 產出三種截然不同的設計方向
- 💬 **自然對話** - 不再是制式問答，而是真正的設計對話
- 🚀 **可擴展** - 本地開發，支援部署到 Vercel

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 API Key

編輯 `.env` 檔案，填入你的 OpenAI API Key：

```
OPENAI_API_KEY=sk-your-api-key-here
```

取得 API Key: https://platform.openai.com/api-keys

### 3. 啟動伺服器

```bash
npm start
```

伺服器會在 http://localhost:3000 運行

### 4. 開啟前端

用瀏覽器打開 `index.html` 檔案即可開始使用

## 使用方式

1. 描述你想要的網站感覺（任何想法都可以）
2. AI 會追問具體問題，幫助你釐清需求
3. 當你說「完成」或「可以了」時，AI 會產出三種設計方向
4. 按「重新開始」可以再次對話

## 範例對話

```
你: 我想要一個很酷的設計
AI: 聽起來很棒！可以多描述一下「很酷」是什麼樣子嗎？例如它讓你想到什麼場景或畫面？

你: 像是科幻電影裡的實驗室那種感覺
AI: 很好！這個比喻很具體。那麼實驗室裡的氣氛是緊湊的？還是神秘的呢？

你: 神秘的，有點像探索未知的感覺
AI: 明白了。請問光線方面，你想要那種全暗環境下只有螢光線條？
...
```

## 技術架構

- **前端**: 原生 HTML/CSS/JS
- **後端**: Node.js + Express
- **AI**: OpenAI GPT-4o
- **部署**: 支援 Vercel

## 部署到 Vercel

1. 將專案推送到 GitHub
2. 在 Vercel  import 專案
3. 在 Vercel 後台設定環境變數 `OPENAI_API_KEY`
4. 部署完成

## 檔案結構

```
├── index.html          # 前端頁面
├── server.js           # 後端伺服器
├── package.json        # 專案依賴
├── .env                # 環境變數 (不要 commit)
├── .env.example        # 環境變數範例
├── .gitignore          # Git 忽略檔案
└── README.md           # 說明文件
```

## License

MIT
