import React, { useState, useMemo } from 'react';
import { Search, Sparkles, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import FEATURES, { getFeaturesWithNewFlag, FEATURE_CATEGORIES, FeatureCategory } from '@/data/featuresRegistry';

const CATEGORY_COLORS: Record<FeatureCategory, string> = {
  'Point of Sale': 'bg-blue-100 text-blue-700 border-blue-200',
  'Sales': 'bg-green-100 text-green-700 border-green-200',
  'Customers': 'bg-purple-100 text-purple-700 border-purple-200',
  'Inventory': 'bg-amber-100 text-amber-700 border-amber-200',
  'Repairs': 'bg-orange-100 text-orange-700 border-orange-200',
  'Shifts': 'bg-teal-100 text-teal-700 border-teal-200',
  'HR': 'bg-pink-100 text-pink-700 border-pink-200',
  'Settings': 'bg-gray-100 text-gray-700 border-gray-200',
};

const FeaturesHelp: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFullGuide, setShowFullGuide] = useState<string | null>(null);

  const features = useMemo(() => getFeaturesWithNewFlag(), []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return features
      .filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.keywords.some(k => k.toLowerCase().includes(q)) ||
        f.description.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, features]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return features.filter(f => {
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      const matchesSearch = !q ||
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.keywords.some(k => k.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [query, selectedCategory, features]);

  const newCount = features.filter(f => f.isNew).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Features & Help Guide
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {FEATURES.length} features available · {newCount} new in the last 30 days
          </p>
        </div>
        {newCount > 0 && (
          <Badge className="bg-blue-600 text-white text-xs px-3 py-1">
            {newCount} New
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10 pr-4"
          placeholder="Search features, shortcuts, workflows…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {/* Auto-suggest dropdown */}
        {suggestions.length > 0 && query.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {suggestions.map(f => (
              <button
                key={f.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                onClick={() => {
                  setQuery(f.name);
                  setExpandedId(f.id);
                }}
              >
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[f.category]}`}>
                  {f.category}
                </span>
                <span className="text-sm font-medium text-gray-800">{f.name}</span>
                {f.isNew && <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">New</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCategory === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          All ({features.length})
        </button>
        {FEATURE_CATEGORIES.filter(c => features.some(f => f.category === c)).map(cat => {
          const count = features.filter(f => f.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCategory === cat ? `${CATEGORY_COLORS[cat]} border-current` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Feature list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No features match "{query}"</p>
          </div>
        ) : (
          filtered.map(feature => {
            const isExpanded = expandedId === feature.id;
            const isFullGuide = showFullGuide === feature.id;
            return (
              <div
                key={feature.id}
                className={`border rounded-xl transition-all ${isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {/* Feature header row */}
                <button
                  className="w-full flex items-start gap-3 px-4 py-4 text-left"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : feature.id);
                    if (!isExpanded) setShowFullGuide(null);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{feature.name}</span>
                      {feature.isNew && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">NEW</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[feature.category]}`}>
                        {feature.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                    {/* Quick guide */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Guide</p>
                      <ol className="space-y-1.5">
                        {feature.shortGuide.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Full guide toggle */}
                    <div>
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                        onClick={() => setShowFullGuide(isFullGuide ? null : feature.id)}
                      >
                        {isFullGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isFullGuide ? 'Hide' : 'Show'} full guide
                      </button>

                      {isFullGuide && (
                        <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-4">
                          {feature.fullGuide.map((section, i) => (
                            <div key={i}>
                              <p className="text-xs font-semibold text-gray-700 mb-1">{section.title}</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{section.content}</p>
                              {i < feature.fullGuide.length - 1 && <div className="border-t border-gray-200 mt-3" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Go to feature link */}
                    {feature.path && (
                      <button
                        className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                        onClick={() => navigate(feature.path!)}
                      >
                        <ExternalLink size={11} />
                        Go to {feature.category} page
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeaturesHelp;
