import { useState, useRef, useEffect } from 'react';

export default function AutocompleteInput({ id, name, value, onChange, options, placeholder, required, excludeValue }) {
  const [query, setQuery] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) => {
    if (excludeValue && opt === excludeValue) return false;
    if (!query) return true;
    return opt.toLowerCase().includes(query.toLowerCase());
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setActiveIndex(-1);
    // Only fire onChange if the typed text exactly matches an option (case-insensitive)
    const exactMatch = options.find((o) => o.toLowerCase() === val.toLowerCase());
    onChange(name, exactMatch || val);
  };

  const handleSelect = (opt) => {
    setQuery(opt);
    setShowDropdown(false);
    setActiveIndex(-1);
    onChange(name, opt);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleFocus = () => {
    setShowDropdown(true);
  };

  const highlightMatch = (text) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="autocomplete-highlight">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        name={name}
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {showDropdown && filtered.length > 0 && (
        <ul className="autocomplete-dropdown" ref={listRef}>
          {filtered.map((opt, i) => (
            <li
              key={opt}
              className={`autocomplete-item ${i === activeIndex ? 'active' : ''}`}
              onMouseDown={() => handleSelect(opt)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="autocomplete-item-icon">📍</span>
              {highlightMatch(opt)}
            </li>
          ))}
        </ul>
      )}
      {showDropdown && query && filtered.length === 0 && (
        <ul className="autocomplete-dropdown">
          <li className="autocomplete-empty">No matching locations</li>
        </ul>
      )}
    </div>
  );
}
