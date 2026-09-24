import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeLocalDb } from './services/localStore';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/admin.css';

initializeLocalDb().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode><App /></StrictMode>,
  );
}).catch((error) => {
  console.error('Could not initialize the local SQLite database', error);
  createRoot(document.getElementById('root')).render(<p role="alert">تعذر فتح قاعدة بيانات المتجر المحلية. يرجى تحديث الصفحة.</p>);
});
