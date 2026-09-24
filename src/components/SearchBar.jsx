import { CloseIcon, SearchIcon } from './Icons';

export default function SearchBar({ value, onChange, placeholder = 'Search products…' }) {
  return (
    <div className="searchbar" role="search">
      <SearchIcon />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Search products" />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}><CloseIcon width={16} height={16} /></button>
      )}
    </div>
  );
}
