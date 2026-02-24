import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  onSearch?: (query: string) => Promise<Option[]>;
  isLoading?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  required = false,
  onSearch,
  isLoading = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayOptions, setDisplayOptions] = useState<Option[]>(options);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDoneRef = useRef(false);


  useEffect(() => {
    if (onSearch && isOpen && !initialFetchDoneRef.current && searchTerm === '') {
      setLocalLoading(true);
      onSearch('')
        .then((results) => {
          setDisplayOptions(results);
          initialFetchDoneRef.current = true;
        })
        .catch((error) => {
          console.error('Initial fetch error:', error);
          setDisplayOptions([]);
        })
        .finally(() => {
          setLocalLoading(false);
        });
    }
  }, [isOpen, onSearch]);

  
  useEffect(() => {
    if (!onSearch) {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setDisplayOptions(filtered);
    }
  }, [options, searchTerm, onSearch]);


  useEffect(() => {
    if (!onSearch) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchTerm.trim()) {
      return;
    }

    setLocalLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(searchTerm);
        setDisplayOptions(results);
      } catch (error) {
        console.error('Search error:', error);
        setDisplayOptions([]);
      } finally {
        setLocalLoading(false);
      }
    }, 300); 
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, onSearch]);

  const filteredOptions = displayOptions;


  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }

    if (onSearch && displayOptions.length > 0) {
      const found = displayOptions.find(opt => opt.value === value);
      if (found) {
        setSelectedOption(found);
      }
    } else {
      const found = options.find(opt => opt.value === value);
      if (found) {
        setSelectedOption(found);
      }
    }
  }, [value, displayOptions, options, onSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        
        initialFetchDoneRef.current = false;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : (selectedOption?.label || '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {localLoading || isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setSelectedOption(option);
                    setSearchTerm('');
                    setIsOpen(false);
                  }
                }}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  option.disabled
                    ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                    : value === option.value
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
