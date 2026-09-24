import { useRef, useState } from 'react';
import Img from '../components/Img';
import { ChevronLeft, ChevronRight, CloseIcon } from '../components/Icons';
import { useToast } from '../context/ToastContext';
import { isCloudinaryConfigured, uploadImage } from '../services/cloudinary';

/** Upload one file at a time to Cloudinary; returns { url, publicId } */
function useUpload(folder) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (files) => {
    setBusy(true);
    const out = [];
    try {
      for (const f of files) out.push(await uploadImage(f, { folder }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
    return out;
  };
  return { busy, run };
}

/** Single image field (logo, hero, slide, category, banner…) */
export default function ImageUploader({ label, value, onChange, folder = 'store', ratio = '4 / 3' }) {
  const inputRef = useRef(null);
  const { busy, run } = useUpload(folder);
  const pick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const [res] = await run(files.slice(0, 1));
    if (res) onChange(res.url, res.publicId);
  };
  return (
    <div className="uploader">
      {label && <span className="uploader-label">{label}</span>}
      <div className="uploader-box">
        {value ? <Img src={value} alt="" ratio={ratio} sizes="240px" width={480} /> : <div className="uploader-empty" style={{ aspectRatio: ratio }}>No image</div>}
      </div>
      <div className="uploader-actions">
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !isCloudinaryConfigured} onClick={() => inputRef.current?.click()}>
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('', '')}>Remove</button>}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
      {!isCloudinaryConfigured && <small className="field-error">Cloudinary env vars are missing.</small>}
    </div>
  );
}

/** Multiple images with ordering (product galleries). images: [{url, public_id}] */
export function ImageList({ label, images, onChange, folder = 'products' }) {
  const inputRef = useRef(null);
  const { busy, run } = useUpload(folder);
  const add = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const res = await run(files);
    if (res.length) onChange([...images, ...res.map((r) => ({ url: r.url, public_id: r.publicId }))]);
  };
  const move = (i, d) => {
    const next = [...images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="image-list">
      <div className="image-list-head">
        <strong>{label}</strong>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !isCloudinaryConfigured} onClick={() => inputRef.current?.click()}>{busy ? 'Uploading…' : 'Add images'}</button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={add} />
      </div>
      {images.length === 0 ? <p className="muted small">No images yet.</p> : (
        <div className="thumb-row">
          {images.map((im, i) => (
            <div className="thumb" key={`${im.url}-${i}`}>
              <Img src={im.url} alt="" ratio="1 / 1" sizes="96px" width={200} />
              {i === 0 && <span className="thumb-tag">Main</span>}
              <div className="thumb-actions">
                <button type="button" aria-label="Move left" onClick={() => move(i, -1)}><ChevronLeft width={14} height={14} /></button>
                <button type="button" aria-label="Move right" onClick={() => move(i, 1)}><ChevronRight width={14} height={14} /></button>
                <button type="button" aria-label="Remove image" onClick={() => onChange(images.filter((_, k) => k !== i))}><CloseIcon width={14} height={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
