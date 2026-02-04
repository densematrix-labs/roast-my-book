# AI 毒舌书评生成器 — Mini Spec

## 目标
让用户输入书名，AI 用各种搞笑风格（毒舌/文艺/中二/甄嬛体等）生成书评，解决 Goodreads 差评太无聊的痛点。

## 核心功能
- 输入框：用户输入书名或粘贴书的简介
- 风格选择：毒舌 / 文艺 / 中二 / 甄嬛体 / 鲁迅体 / 莎士比亚体
- AI 生成：调用 LLM 生成该风格的书评（300-500字）
- 操作按钮：一键复制 / 分享
- 国际化：7 种语言支持（en/zh/ja/de/fr/ko/es）
- 语言切换：浏览器语言自动检测 + 手动切换器

## 技术方案
- 前端：React + Vite (TypeScript) + react-i18next
- 后端：Python FastAPI
- AI 调用：通过 llm-proxy.densematrix.ai (gemini-2.5-flash)
- 部署：Docker → langsheng
- 域名：roast-my-book.demo.densematrix.ai

## 完成标准
- [ ] 核心功能可用（输入书名 → 选择风格 → 生成书评 → 复制）
- [ ] 6 种书评风格全部可用
- [ ] 7 种语言 i18n 完整
- [ ] 部署到 roast-my-book.demo.densematrix.ai
- [ ] Health check 通过
- [ ] Unit test 覆盖率 ≥ 95%
- [ ] E2E test 核心流程
- [ ] 基本 UI 可用且在不同语言下不破布局

## API 设计
```
POST /api/generate-review
{
  "book_name": "string",
  "style": "toxic|literary|chuunibyou|zhenhuan|luxun|shakespeare", 
  "language": "en|zh|ja|de|fr|ko|es"
}

Response:
{
  "review": "string (300-500字书评)",
  "style": "string",
  "book_name": "string"
}

GET /health
Response: {"status": "ok"}
```