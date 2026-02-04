import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';

interface ReviewResponse {
  review: string;
  style: string;
  book_name: string;
  language: string;
}

const STYLES = ['toxic', 'literary', 'chuunibyou', 'zhenhuan', 'luxun', 'shakespeare'] as const;
const LANGUAGES = ['en', 'zh', 'ja', 'de', 'fr', 'ko', 'es'] as const;

function App() {
  const { t, i18n } = useTranslation();
  const [bookName, setBookName] = useState('');
  const [style, setStyle] = useState<string>('toxic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!bookName.trim()) {
      setError(t('error'));
      return;
    }

    setIsGenerating(true);
    setError('');
    setReview(null);

    try {
      const response = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_name: bookName,
          style,
          language: i18n.language,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate review');
      const data = await response.json();
      setReview(data);
    } catch {
      setError(t('error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.review);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail
    }
  };

  const handleShare = () => {
    if (!review) return;
    if (navigator.share) {
      navigator.share({ title: t('appTitle'), text: review.review });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="masthead">
          <h1>{t('appTitle')}</h1>
          <p className="tagline">{t('subtitle')}</p>
        </div>
        <nav className="lang-bar">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={`lang-btn ${i18n.language === lang ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </nav>
      </header>

      {/* Main */}
      <main>
        <section className="form-section">
          <div className="field">
            <label className="field-label" htmlFor="book-name">
              {t('bookNameLabel')}
            </label>
            <textarea
              id="book-name"
              className="book-input"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              placeholder={t('bookNamePlaceholder')}
              rows={3}
            />
          </div>

          <div className="field">
            <label className="field-label">{t('styleLabel')}</label>
            <div className="style-options">
              {STYLES.map((s) => (
                <button
                  key={s}
                  className={`style-pill ${style === s ? 'selected' : ''}`}
                  onClick={() => setStyle(s)}
                  type="button"
                >
                  {t(`styles.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
            onClick={handleGenerate}
            disabled={isGenerating || !bookName.trim()}
          >
            {isGenerating ? t('generating') : t('generateButton')}
          </button>

          {error && <p className="error-msg">{error}</p>}
        </section>

        {/* Review Output */}
        {review && (
          <section className="review-section">
            <div className="review-header">
              <span className="review-book-title">{review.book_name}</span>
              <span className="review-style-tag">{t(`styles.${review.style}`)}</span>
            </div>
            <div className="review-body">{review.review}</div>
            <div className="review-actions">
              <button className="action-btn" onClick={handleCopy}>
                {copied ? t('copySuccess') : t('copyButton')}
              </button>
              <button className="action-btn" onClick={handleShare}>
                {t('shareButton')}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}

export default App;
