import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';

interface ReviewResponse {
  review: string;
  style: string;
  book_name: string;
  language: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [bookName, setBookName] = useState('');
  const [style, setStyle] = useState('toxic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState('');

  const styles = ['toxic', 'literary', 'chuunibyou', 'zhenhuan', 'luxun', 'shakespeare'];
  const languages = ['en', 'zh', 'ja', 'de', 'fr', 'ko', 'es'];

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_name: bookName,
          style: style,
          language: i18n.language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate review');
      }

      const data = await response.json();
      setReview(data);
    } catch (err) {
      console.error('Generation error:', err);
      setError(t('error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!review) return;

    try {
      await navigator.clipboard.writeText(review.review);
      alert(t('copySuccess'));
    } catch (err) {
      console.error('Copy error:', err);
      alert(t('copyError'));
    }
  };

  const handleShare = () => {
    if (!review) return;

    if (navigator.share) {
      navigator.share({
        title: t('appTitle'),
        text: review.review,
      });
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>📚 {t('appTitle')}</h1>
        <p className="subtitle">{t('subtitle')}</p>
        
        {/* Language Selector */}
        <div className="language-selector">
          <label htmlFor="language">{t('language')}: </label>
          <select
            id="language"
            value={i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {t(`languages.${lang}`)}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="main">
        <div className="form-container">
          <div className="form-group">
            <label htmlFor="book-name">{t('bookNameLabel')}</label>
            <textarea
              id="book-name"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              placeholder={t('bookNamePlaceholder')}
              className="book-input"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="style">{t('styleLabel')}</label>
            <select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="style-select"
            >
              {styles.map((s) => (
                <option key={s} value={s}>
                  {t(`styles.${s}`)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !bookName.trim()}
            className={`generate-btn ${isGenerating ? 'generating' : ''}`}
          >
            {isGenerating ? t('generating') : t('generateButton')}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        {review && (
          <div className="review-container">
            <h2>{t('reviewTitle')}</h2>
            <div className="review-meta">
              <span className="book-name">📖 {review.book_name}</span>
              <span className="style-name">{t(`styles.${review.style}`)}</span>
            </div>
            <div className="review-content">
              {review.review}
            </div>
            <div className="action-buttons">
              <button onClick={handleCopy} className="copy-btn">
                {t('copyButton')}
              </button>
              <button onClick={handleShare} className="share-btn">
                {t('shareButton')}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}

export default App;