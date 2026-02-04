import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from main import app

client = TestClient(app)

MOCK_REVIEW_ZH = "这是一个测试书评，用毒舌风格写的。这本书实在是太普通了，就像路边的石头一样平凡无奇。作者显然没有什么想象力，情节老套得让人昏昏欲睡。不过如果你失眠的话，这本书倒是个不错的选择。总的来说，这本书的存在意义就是证明了出版社会接受任何东西。"
MOCK_REVIEW_EN = "This is a test book review in English. The book is utterly mediocre, like a sandwich without any filling. The author clearly lacks imagination and the plot is more predictable than yesterday's weather forecast."


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
    assert response.status_code == 400


def test_generate_review_whitespace_book_name():
    """测试空白书名"""
    response = client.post("/api/generate-review", json={
        "book_name": "   ",
        "style": "toxic",
        "language": "zh"
    })
    assert response.status_code == 400


def test_generate_review_invalid_style():
    """测试无效风格"""
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "invalid_style",
        "language": "zh"
    })
    assert response.status_code == 422


def test_generate_review_invalid_language():
    """测试无效语言"""
    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic",
        "language": "invalid_lang"
    })
    assert response.status_code == 422


def test_generate_review_missing_fields():
    """测试缺少必填字段"""
    response = client.post("/api/generate-review", json={})
    assert response.status_code == 422

    response = client.post("/api/generate-review", json={"book_name": "Test"})
    assert response.status_code == 422


@patch('main.call_llm', new_callable=AsyncMock)
def test_generate_review_success(mock_call_llm):
    """测试成功生成书评"""
    mock_call_llm.return_value = MOCK_REVIEW_ZH

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
    assert len(data["review"]) > 50
    mock_call_llm.assert_called_once()


@patch('main.call_llm', new_callable=AsyncMock)
def test_generate_review_english(mock_call_llm):
    """测试英文书评生成"""
    mock_call_llm.return_value = MOCK_REVIEW_EN

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


@patch('main.call_llm', new_callable=AsyncMock)
def test_generate_review_default_language(mock_call_llm):
    """测试默认语言为中文"""
    mock_call_llm.return_value = MOCK_REVIEW_ZH

    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "zh"


@patch('main.call_llm', new_callable=AsyncMock)
def test_call_llm_failure(mock_call_llm):
    """测试 LLM 调用失败的情况"""
    from fastapi import HTTPException
    mock_call_llm.side_effect = HTTPException(status_code=500, detail="AI 生成失败: connection error")

    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic",
        "language": "zh"
    })

    assert response.status_code == 500


@patch('main.call_llm', new_callable=AsyncMock)
def test_call_llm_generic_exception(mock_call_llm):
    """测试 LLM 调用抛出通用异常"""
    mock_call_llm.side_effect = Exception("unexpected error")

    response = client.post("/api/generate-review", json={
        "book_name": "测试书籍",
        "style": "toxic",
        "language": "zh"
    })

    assert response.status_code == 500
    assert "生成书评时发生错误" in response.json()["detail"]


@patch('main.call_llm', new_callable=AsyncMock)
def test_all_styles_valid(mock_call_llm):
    """测试所有风格都是有效的"""
    mock_call_llm.return_value = MOCK_REVIEW_ZH
    valid_styles = ["toxic", "literary", "chuunibyou", "zhenhuan", "luxun", "shakespeare"]

    for style in valid_styles:
        response = client.post("/api/generate-review", json={
            "book_name": "测试",
            "style": style,
            "language": "zh"
        })
        assert response.status_code == 200, f"Style {style} failed"

    assert mock_call_llm.call_count == len(valid_styles)


@patch('main.call_llm', new_callable=AsyncMock)
def test_all_languages_valid(mock_call_llm):
    """测试所有语言都是有效的"""
    mock_call_llm.return_value = MOCK_REVIEW_EN
    valid_languages = ["en", "zh", "ja", "de", "fr", "ko", "es"]

    for language in valid_languages:
        response = client.post("/api/generate-review", json={
            "book_name": "测试",
            "style": "toxic",
            "language": language
        })
        assert response.status_code == 200, f"Language {language} failed"

    assert mock_call_llm.call_count == len(valid_languages)


@patch('main.call_llm', new_callable=AsyncMock)
def test_review_response_format(mock_call_llm):
    """测试返回格式"""
    mock_call_llm.return_value = "  some review with spaces  "

    response = client.post("/api/generate-review", json={
        "book_name": "测试",
        "style": "toxic",
        "language": "zh"
    })

    assert response.status_code == 200
    data = response.json()
    # review should be stripped
    assert data["review"] == "some review with spaces"
    assert "book_name" in data
    assert "style" in data
    assert "language" in data


@patch('main.call_llm', new_callable=AsyncMock)
def test_english_uses_english_prompts(mock_call_llm):
    """测试英文请求使用英文提示词"""
    mock_call_llm.return_value = MOCK_REVIEW_EN

    response = client.post("/api/generate-review", json={
        "book_name": "The Great Gatsby",
        "style": "shakespeare",
        "language": "en"
    })

    assert response.status_code == 200
    # Verify the prompt was in English
    call_args = mock_call_llm.call_args
    prompt = call_args[0][0]
    assert "Please" in prompt or "Write" in prompt


@patch('main.call_llm', new_callable=AsyncMock)
def test_chinese_uses_chinese_prompts(mock_call_llm):
    """测试中文请求使用中文提示词"""
    mock_call_llm.return_value = MOCK_REVIEW_ZH

    response = client.post("/api/generate-review", json={
        "book_name": "三体",
        "style": "toxic",
        "language": "zh"
    })

    assert response.status_code == 200
    call_args = mock_call_llm.call_args
    prompt = call_args[0][0]
    assert "请" in prompt or "书评" in prompt


# ===== call_llm 单元测试 =====

@pytest.mark.asyncio
async def test_call_llm_success():
    """测试 call_llm 成功调用"""
    from main import call_llm
    import httpx

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "test review content"}}]
    }

    with patch('main.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await call_llm("test prompt", "zh")
        assert result == "test review content"
        mock_client.post.assert_called_once()


@pytest.mark.asyncio
async def test_call_llm_http_error():
    """测试 call_llm HTTP 错误"""
    from main import call_llm
    from fastapi import HTTPException
    import httpx

    with patch('main.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.HTTPStatusError(
            "500 error", request=MagicMock(), response=MagicMock(status_code=500)
        )
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc_info:
            await call_llm("test prompt", "zh")
        assert exc_info.value.status_code == 500
        assert "AI 生成失败" in exc_info.value.detail


@pytest.mark.asyncio
async def test_call_llm_connection_error():
    """测试 call_llm 连接错误"""
    from main import call_llm
    from fastapi import HTTPException

    with patch('main.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("Connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc_info:
            await call_llm("test prompt", "en")
        assert exc_info.value.status_code == 500


# ===== 边界条件 =====

@patch('main.call_llm', new_callable=AsyncMock)
def test_non_en_non_zh_language_uses_zh_prompts(mock_call_llm):
    """测试非英文非中文语言（如日文）使用中文提示词模板"""
    mock_call_llm.return_value = MOCK_REVIEW_ZH

    response = client.post("/api/generate-review", json={
        "book_name": "吾輩は猫である",
        "style": "literary",
        "language": "ja"
    })

    assert response.status_code == 200
    call_args = mock_call_llm.call_args
    prompt = call_args[0][0]
    # Non-en languages should use ZH prompts
    assert "请" in prompt or "书评" in prompt


def test_main_block():
    """测试 __main__ 入口不影响导入"""
    # main module is already imported, just verify app exists
    from main import app
    assert app is not None
    assert app.title == "AI 毒舌书评生成器"
