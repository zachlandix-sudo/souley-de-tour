import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createReview } from '../services/spotService';
import { errorMessage } from '../utils/errors';
import { useI18n } from '../i18n/I18nContext';
import { compressImage, MAX_REVIEW_PHOTOS } from '../utils/imageCompress';

// Write-a-review form with star picker and up to 3 photos. Guests see a sign-in prompt.
export default function ReviewForm({ spotId, user, onCreated }) {
  const location = useLocation();
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (!user) {
    return (
      <p className="mt-6 border-l-4 border-orange bg-paper p-4 text-sm">
        <Link to="/login" state={{ from: location }} className="text-ember underline">{t('reviews.signin')}</Link>
      </p>
    );
  }
  if (done) return <p role="status" className="mt-6 border-l-4 border-orange bg-paper p-4 text-sm">{done}</p>;

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_REVIEW_PHOTOS - photos.length);
    e.target.value = '';
    try {
      const urls = await Promise.all(files.map((f) => compressImage(f)));
      setPhotos((p) => [...p, ...urls].slice(0, MAX_REVIEW_PHOTOS));
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please choose a star rating.');
    if (!comment.trim()) return setError('Please write a comment.');
    setBusy(true);
    try {
      const { review, message } = await createReview(spotId, { rating, title: title.trim() || undefined, comment: comment.trim(), photos });
      setDone(message || 'Thanks! Your review is live.');
      onCreated?.(review);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border border-line p-5" aria-label="Write a review">
      <h3 className="font-display text-2xl">{t('reviews.write')}</h3>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)} className={`text-3xl leading-none ${n <= rating ? 'text-orange' : 'text-line'}`}>★</button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title (optional)" aria-label="Review title" className="field-line w-full" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={4} placeholder="Share your experience" aria-label="Review comment" className="field w-full" />
      <div>
        <div className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt={`Review photo ${i + 1}`} className="h-20 w-20 object-cover" />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-night text-xs text-white">×</button>
            </div>
          ))}
        </div>
        {photos.length < MAX_REVIEW_PHOTOS && (
          <label className="mt-2 inline-block cursor-pointer text-sm text-ember underline">
            {t('reviews.addPhotos')} ({photos.length}/{MAX_REVIEW_PHOTOS})
            <input type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
          </label>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-dark btn-sm">{busy ? '…' : t('reviews.submit')}</button>
    </form>
  );
}
