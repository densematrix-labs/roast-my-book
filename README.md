# AI 毒舌书评生成器 🔥📚

输入书名，AI 用各种风格（毒舌/文艺/中二/甄嬛体）生成搞笑书评。解决 Goodreads 差评太无聊的痛点。

## 功能特色

- 🎭 6 种书评风格：毒舌 / 文艺 / 中二 / 甄嬛体 / 鲁迅体 / 莎士比亚体
- 🌍 7 种语言支持：en/zh/ja/de/fr/ko/es  
- 📋 一键复制分享
- ⚡ 快速生成 300-500 字书评

## 技术栈

- 前端: React + Vite + TypeScript + react-i18next
- 后端: Python FastAPI
- AI: gemini-2.5-flash via llm-proxy
- 部署: Docker + Nginx + Let's Encrypt

## 本地开发

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend  
pip install -r requirements.txt
uvicorn main:app --reload
```

### Docker
```bash
docker-compose up --build
```

## 在线体验

🔗 https://roast-my-book.demo.densematrix.ai

## License

MIT