import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MockBusiness, ServiceCategory, SearchFilters, PriceLevel } from '../types';
import { CATEGORIES } from '../data/mockData';
import { useDemoData } from '../context/DemoDataContext';
import {
  MapPin,
  Star,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ClientSearchProps {
  category: ServiceCategory;
  onChangeCategory: () => void;
  onOpenBooking: (business: MockBusiness) => void;
  onOpenWaitlist: (business: MockBusiness) => void;
}

export const ClientSearch: React.FC<ClientSearchProps> = ({
  category,
  onChangeCategory,
  onOpenBooking,
  onOpenWaitlist,
}) => {
  const { businesses } = useDemoData();

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    maxDistanceMiles: 15,
    priceLevels: [1, 2, 3],
    minRating: 0,
    openNowOnly: false,
    openingsTodayOnly: false,
    selectedSubServices: [],
  });

  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const currentCategoryInfo = CATEGORIES.find((c) => c.id === category);

  // Available sub-services for this category
  const availableSubServices = useMemo(() => {
    const list = businesses
      .filter((b) => b.category === category)
      .flatMap((b) => b.services.map((s) => s.name));
    return Array.from(new Set(list));
  }, [businesses, category]);

  // Filtering + Strict Distance-Only Sorting
  const filteredAndSortedBusinesses = useMemo(() => {
    return businesses
      .filter((b) => b.category === category)
      .filter((b) => b.distanceMiles <= filters.maxDistanceMiles)
      .filter((b) => filters.priceLevels.includes(b.priceLevel))
      .filter((b) => b.rating >= filters.minRating)
      .filter((b) => (!filters.openNowOnly ? true : b.isOpenNow))
      .filter((b) => (!filters.openingsTodayOnly ? true : b.hasOpeningsToday))
      .filter((b) => {
        if (filters.selectedSubServices.length === 0) return true;
        return b.services.some((s) => filters.selectedSubServices.includes(s.name));
      })
      // MANDATORY SPEC: ONLY distance is a sort! Distance ascending.
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [businesses, category, filters]);

  const togglePriceLevel = (lvl: PriceLevel) => {
    setFilters((prev) => {
      const exists = prev.priceLevels.includes(lvl);
      if (exists) {
        if (prev.priceLevels.length === 1) return prev; // keep at least 1
        return { ...prev, priceLevels: prev.priceLevels.filter((p) => p !== lvl) };
      }
      return { ...prev, priceLevels: [...prev.priceLevels, lvl] };
    });
  };

  const toggleSubService = (svcName: string) => {
    setFilters((prev) => {
      const exists = prev.selectedSubServices.includes(svcName);
      if (exists) {
        return {
          ...prev,
          selectedSubServices: prev.selectedSubServices.filter((s) => s !== svcName),
        };
      }
      return { ...prev, selectedSubServices: [...prev.selectedSubServices, svcName] };
    });
  };

  const resetFilters = () => {
    setFilters({
      maxDistanceMiles: 15,
      priceLevels: [1, 2, 3],
      minRating: 0,
      openNowOnly: false,
      openingsTodayOnly: false,
      selectedSubServices: [],
    });
  };

  const formatPrice = (lvl: PriceLevel) => '$'.repeat(lvl);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top breadcrumb / navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <button
            onClick={onChangeCategory}
            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} className="mr-1" />
            <span>Change Service Category</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {currentCategoryInfo?.name || 'Local Businesses'}
            </h1>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
              Sorted by Distance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fremont, CA (37.5485° N, 121.9886° W) • Guaranteed no double-booking
          </p>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="sm:hidden flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
        >
          <Filter size={14} />
          <span>Filters ({filteredAndSortedBusinesses.length} results)</span>
          {showFiltersMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className={`lg:block ${showFiltersMobile ? 'block' : 'hidden sm:block'}`}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Filter size={16} className="text-indigo-600" />
                <span>Search Filters</span>
              </div>
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {/* Radius Slider / Chips */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                <span>Maximum Distance</span>
                <span className="text-indigo-600 font-bold">{filters.maxDistanceMiles} miles</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={filters.maxDistanceMiles}
                onChange={(e) =>
                  setFilters({ ...filters, maxDistanceMiles: Number(e.target.value) })
                }
                className="w-full accent-indigo-600 cursor-pointer mb-2"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>1 mi</span>
                <span>5 mi</span>
                <span>10 mi</span>
                <span>20 mi</span>
              </div>
            </div>

            {/* Price Level Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Price Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as PriceLevel[]).map((lvl) => {
                  const selected = filters.priceLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => togglePriceLevel(lvl)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        selected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {formatPrice(lvl)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Minimum Rating
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 4.5, 4.8].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFilters({ ...filters, minRating: rate })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                      filters.minRating === rate
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <Star size={12} className={filters.minRating === rate ? 'fill-white text-white' : 'text-amber-400 fill-amber-400'} />
                    <span>{rate === 0 ? 'Any' : `${rate}+`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Switches */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Open Right Now</span>
                <input
                  type="checkbox"
                  checked={filters.openNowOnly}
                  onChange={(e) => setFilters({ ...filters, openNowOnly: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Has Openings Today</span>
                <input
                  type="checkbox"
                  checked={filters.openingsTodayOnly}
                  onChange={(e) =>
                    setFilters({ ...filters, openingsTodayOnly: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            </div>

            {/* Specific sub-services */}
            {availableSubServices.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Filter by Specific Service
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSubServices.map((svcName) => {
                    const isSelected = filters.selectedSubServices.includes(svcName);
                    return (
                      <button
                        key={svcName}
                        type="button"
                        onClick={() => toggleSubService(svcName)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {svcName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business List (Sorted strictly by distance ascending) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
            <span>
              Showing <b>{filteredAndSortedBusinesses.length}</b> verified providers within{' '}
              {filters.maxDistanceMiles} miles
            </span>
            <span className="font-semibold text-slate-700">Sort: Distance (Nearest First)</span>
          </div>

          <AnimatePresence>
            {filteredAndSortedBusinesses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Filter size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No businesses match your filters</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try expanding your search distance or clearing some of the filters to see more providers.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  Reset Filters
                </button>
              </motion.div>
            ) : (
              filteredAndSortedBusinesses.map((biz) => (
                <motion.div
                  key={biz.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5"
                >
                  {/* Business Thumbnail */}
                  <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                    <img
                      src={biz.image}
                      alt={biz.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs text-[11px] font-bold text-slate-800 px-2 py-0.5 rounded-md shadow-xs flex items-center space-x-1">
                      <MapPin size={11} className="text-indigo-600" />
                      <span>{biz.distanceMiles.toFixed(1)} mi</span>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                            {biz.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                            <span>{biz.address}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {formatPrice(biz.priceLevel)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 mt-2 text-xs">
                        <div className="flex items-center space-x-1 text-amber-600 font-bold">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>{biz.rating}</span>
                          <span className="text-slate-400 font-normal">({biz.reviewCount})</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center space-x-1 text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{biz.phone}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center space-x-1">
                          {biz.isOpenNow ? (
                            <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                              <CheckCircle size={12} />
                              <span>Open Now</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center space-x-1">
                              <Clock size={12} />
                              <span>Closed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                        {biz.description}
                      </p>

                      {/* Services badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {biz.services.map((svc) => (
                          <span
                            key={svc.id}
                            className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80"
                          >
                            {svc.name} · ${(svc.priceCents / 100).toFixed(0)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Booking / Waitlist Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {biz.hasOpeningsToday ? (
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span>
                            Openings today: <b>{biz.availableSlots.slice(0, 3).join(', ')}</b>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-medium">
                          <XCircle size={14} className="text-amber-500" />
                          <span>Fully booked today · Automated waitlist active</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {biz.hasOpeningsToday ? (
                          <button
                            onClick={() => onOpenBooking(biz)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-200 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Calendar size={13} />
                            <span>Book Slot</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenWaitlist(biz)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-amber-200 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Clock size={13} />
                            <span>Join Waitlist</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
