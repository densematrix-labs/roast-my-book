import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app

client = TestClient(app)

def test_health_check():
    """测试健康检查端点"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "roast-my-book"}

def test_generate_review_missing_book_name():
    """测试缺少书名的情况"""
    response = client.post("/api/generate-review", json={
        "book_name": "",
        "style": "toxic",
        "language": "zh"
    })
    # FastAPI 的 pydantic 验证会拒绝空字符串，但我们的 API 会处理
    assert response.status_code in [400, 422]

def test_generate_review_invalid_style():
    """测试无效风格"""
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "invalid_style",
        "language": "zh"
    })
    assert response.status_code == 422  # pydantic 验证错误

def test_generate_review_invalid_language():
    """测试无效语言"""
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍", 
        "style": "toxic",
        "language": "invalid_lang"
    })
    assert response.status_code == 422  # pydantic 验证错误

@patch('main.call_llm')
@pytest.mark.asyncio
async def test_generate_review_success(mock_call_llm):
    """测试成功生成书评"""
    mock_call_llm.return_value = "这是一个测试书评，用毒舌风格写的。这本书实在是太普通了，就像路边的石头一样平凡无奇。作者显然没有什么想象力，情节老套得让人昏昏欲睡。不过如果你失眠的话，这本书倒是个不错的选择。总的来说，这本书的存在意义就是证明了出版社会接受任何东西。"
    
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic", 
        "language": "zh"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["book_name"] == "测试书籍"
    assert data["style"] == "toxic"
    assert data["language"] == "zh"
    assert len(data["review"]) > 50  # 确保生成了足够长的书评
    mock_call_llm.assert_called_once()

@patch('main.call_llm')
@pytest.mark.asyncio 
async def test_generate_review_english(mock_call_llm):
    """测试英文书评生成"""
    mock_call_llm.return_value = "This is a test book review in English. The book is utterly mediocre, like a sandwich without any filling. The author clearly lacks imagination and the plot is more predictable than yesterday's weather forecast. However, if you suffer from insomnia, this book might be your cure. Overall, this book exists solely to prove that publishers will accept anything."
    
    response = client.post("/api/generate-review", json={
        "book_name": "Test Book",
        "style": "toxic",
        "language": "en"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["book_name"] == "Test Book"
    assert data["style"] == "toxic" 
    assert data["language"] == "en"
    assert len(data["review"]) > 50
    mock_call_llm.assert_called_once()

@patch('main.call_llm')
@pytest.mark.asyncio
async def test_call_llm_failure(mock_call_llm):
    """测试 LLM 调用失败的情况"""
    mock_call_llm.side_effect = Exception("LLM API 调用失败")
    
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic",
        "language": "zh"
    })
    
    assert response.status_code == 500
    assert "生成书评时发生错误" in response.json()["detail"]

def test_all_styles_valid():
    """测试所有风格都是有效的"""
    valid_styles = ["toxic", "literary", "chuunibyou", "zhenhuan", "luxun", "shakespeare"]
    
    for style in valid_styles:
        response = client.post("/api/generate-review", json={
            "book_name": "测试",
            "style": style,
            "language": "zh"
        })
        # 即使 LLM 调用失败，风格验证应该通过
        assert response.status_code in [200, 500]  # 200 成功 或 500 LLM 失败

def test_all_languages_valid():
    """测试所有语言都是有效的"""
    valid_languages = ["en", "zh", "ja", "de", "fr", "ko", "es"]
    
    for language in valid_languages:
        response = client.post("/api/generate-review", json={
            "book_name": "测试",
            "style": "toxic", 
            "language": language
        })
        # 即使 LLM 调用失败，语言验证应该通过
        assert response.status_code in [200, 500]  # 200 成功 或 500 LLM 失败