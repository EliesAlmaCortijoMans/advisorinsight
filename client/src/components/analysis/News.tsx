import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';

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

const News: React.FC<NewsProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/company-news/?symbol=${symbol}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch news');
        }
        const data = await response.json();
        setNews(data);
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
      <div className="grid gap-6">
        {news.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
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
                  <span className="text-sm text-gray-500">
                    {item.source} • {format(item.datetime * 1000, 'MMM d, yyyy')}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {item.headline}
                </h3>
                <p className="text-gray-600 line-clamp-3">
                  {item.summary}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default News; 