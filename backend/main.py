from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator
import httpx
import os
from typing import Literal
import logging
from metrics import record_generation, generation_timer

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI 毒舌书评生成器", version="1.0.0")

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/api/metrics")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM 代理配置
LLM_PROXY_URL = "https://llm-proxy.densematrix.ai"
LLM_PROXY_KEY = "sk-wskhgeyawc"
LLM_MODEL = "gemini-2.5-flash"

class ReviewRequest(BaseModel):
    book_name: str  # min_length validated manually for better error msg
    style: Literal["toxic", "literary", "chuunibyou", "zhenhuan", "luxun", "shakespeare"]
    language: Literal["en", "zh", "ja", "de", "fr", "ko", "es"] = "zh"

class ReviewResponse(BaseModel):
    review: str
    style: str
    book_name: str
    language: str

# 风格定义（中文）
STYLE_PROMPTS_ZH = {
    "toxic": "用毒舌、犀利、搞笑的语调写书评，要尖锐但不恶毒，充满调侃和黑色幽默",
    "literary": "用文艺青年的腔调写书评，充满诗意但又略带装腔作势，多用意象和隐喻",
    "chuunibyou": "用中二病少年的语调写书评，充满夸张的设定、神秘力量和羞耻的台词",
    "zhenhuan": "用甄嬛传的语调写书评，古风雅致、暗含机锋，各种宫斗隐喻",
    "luxun": "用鲁迅的语调写书评，冷峻犀利、一针见血，充满社会批判精神",
    "shakespeare": "用莎士比亚的语调写书评，华丽辞藻、戏剧化表达，充满诗意但略显浮夸"
}

# 风格定义（英文）
STYLE_PROMPTS_EN = {
    "toxic": "Write a book review with a sarcastic, sharp, and humorous tone. Be witty and edgy but not malicious, full of irony and dark humor",
    "literary": "Write a book review in the tone of a pretentious literary hipster, full of poetic language, imagery and metaphors, slightly affected",
    "chuunibyou": "Write a book review in the tone of a chuunibyou (middle school syndrome) teenager, full of exaggerated fantasy settings, mysterious powers and cringe-worthy lines",
    "zhenhuan": "Write a book review in the elegant style of Chinese palace drama, refined yet subtly sharp, full of court intrigue metaphors",
    "luxun": "Write a book review in Lu Xun's style, coldly sharp and penetrating, full of social criticism and sardonic wit",
    "shakespeare": "Write a book review in Shakespearean style, with flowery language, dramatic expressions, poetic but slightly pompous"
}

async def call_llm(prompt: str, language: str) -> str:
    """调用 LLM 代理生成文本"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_PROXY_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {LLM_PROXY_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 800,
                    "temperature": 0.8
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"LLM API 调用失败: {e}")
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "roast-my-book"}

@app.post("/api/generate-review", response_model=ReviewResponse)
async def generate_review(request: ReviewRequest):
    """生成书评"""
    if not request.book_name or not request.book_name.strip():
        raise HTTPException(status_code=400, detail="书名不能为空")
    try:
        # 根据语言选择提示词模板
        style_prompts = STYLE_PROMPTS_EN if request.language == "en" else STYLE_PROMPTS_ZH
        
        # 构建提示词
        style_instruction = style_prompts[request.style]
        
        if request.language == "zh":
            prompt = f"""请{style_instruction}为《{request.book_name}》这本书写一篇书评。

要求：
1. 字数在 300-500 字之间
2. 符合指定风格的语调和特色
3. 要搞笑有趣，但不要过于恶毒
4. 可以适当虚构一些细节来增加趣味性
5. 用中文写作

书名：《{request.book_name}》"""
        else:
            prompt = f"""Please {style_instruction} for the book "{request.book_name}".

Requirements:
1. 300-500 words
2. Match the specified style's tone and characteristics  
3. Be funny and entertaining but not overly malicious
4. Feel free to add fictional details for humor
5. Write in English

Book: "{request.book_name}"

Write the review:"""

        # 调用 LLM 生成
        review = await call_llm(prompt, request.language)
        
        return ReviewResponse(
            review=review.strip(),
            style=request.style,
            book_name=request.book_name,
            language=request.language
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成书评失败: {e}")
        raise HTTPException(status_code=500, detail="生成书评时发生错误")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)