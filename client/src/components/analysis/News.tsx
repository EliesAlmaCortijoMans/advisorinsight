import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ExternalLink, X } from 'lucide-react';

interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface NewsProps {
  symbol?: string;
}

// Predefined categories for financial news
const NEWS_CATEGORIES = [
  { id: 'company', label: 'Company News', color: 'blue' },
  { id: 'earnings', label: 'Earnings', color: 'green' },
  { id: 'market', label: 'Market', color: 'purple' },
  { id: 'technology', label: 'Technology', color: 'indigo' },
  { id: 'economy', label: 'Economy', color: 'red' },
  { id: 'mergers', label: 'M&A', color: 'yellow' }
];

const getCategoryColor = (category: string): string => {
  const foundCategory = NEWS_CATEGORIES.find(
    c => category.toLowerCase().includes(c.id)
  );
  return foundCategory?.color || 'gray';
};

const News: React.FC<NewsProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchNews = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stock/company-news/?symbol=${symbol}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch news');
        }
        const data = await response.json();
        setNews(data);
        setFilteredNews(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load news. Please try again later.';
        setError(errorMessage);
        console.error('Error fetching news:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  // Filter news based on selected categories and search term
  useEffect(() => {
    let filtered = [...news];

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item =>
        selectedCategories.some(category =>
          item.category.toLowerCase().includes(category.toLowerCase()) ||
          item.headline.toLowerCase().includes(category.toLowerCase()) ||
          item.summary.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.headline.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term)
      );
    }

    setFilteredNews(filtered);
  }, [news, selectedCategories, searchTerm]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  if (!symbol) {
    return (
      <div className="text-center text-gray-600 p-4">
        Please select a company to view news.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {NEWS_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${selectedCategories.includes(category.id)
                  ? `bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent'
                }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      <div className="grid gap-6">
        {filteredNews.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No news articles found matching your criteria.
          </div>
        ) : (
          filteredNews.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.headline}
                    className="w-32 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/128x96?text=No+Image';
                    }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.source} • {format(item.datetime * 1000, 'MMM d, yyyy')}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {item.headline}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
                    {item.summary}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getCategoryColor(item.category)}-100 text-${getCategoryColor(item.category)}-800`}>
                      {item.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default News; 