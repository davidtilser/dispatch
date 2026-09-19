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
        if (prev.priceLevels.length === 1) return prev;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#fcf1d0]">
      {/* Top breadcrumb / navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-[#22396f] gap-4">
        <div>
          <button
            onClick={onChangeCategory}
            className="inline-flex items-center text-xs font-semibold text-[#fcf1d0] hover:text-[#d8ceb2] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft size={13} className="mr-1" />
            <span>Change Service Category</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fcf1d0] tracking-tight">
              {currentCategoryInfo?.name || 'Local Businesses'}
            </h1>
            <span className="text-[11px] bg-[#22396f] text-[#fcf1d0] font-bold px-2.5 py-0.5 rounded-full border border-[#22396f]">
              Sorted by Distance
            </span>
          </div>
          <p className="text-xs text-[#d8ceb2] mt-1">
            Fremont, CA (37.5485° N, 121.9886° W) • Sample businesses and availability
          </p>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="sm:hidden flex items-center justify-center space-x-2 px-4 py-2 bg-[#0d1c42] border border-[#22396f] rounded-xl text-xs font-semibold text-[#fcf1d0] shadow-sm"
        >
          <Filter size={13} />
          <span>Filters ({filteredAndSortedBusinesses.length} results)</span>
          {showFiltersMobile ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className={`lg:block ${showFiltersMobile ? 'block' : 'hidden sm:block'}`}>
          <div className="bg-[#0d1c42] rounded-2xl border border-[#22396f] p-6 shadow-lg sticky top-24 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#22396f]">
              <div className="flex items-center space-x-2 text-[#fcf1d0] font-bold text-xs uppercase tracking-wider">
                <Filter size={14} className="text-[#fcf1d0]" />
                <span>Filters</span>
              </div>
              <button
                onClick={resetFilters}
                className="text-xs text-[#d8ceb2] hover:text-[#fcf1d0] flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-[#d8ceb2] mb-2">
                <span>Maximum Distance</span>
                <span className="text-[#fcf1d0] font-bold font-mono">{filters.maxDistanceMiles} miles</span>
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
                className="w-full accent-[#fcf1d0] cursor-pointer mb-2"
              />
              <div className="flex justify-between text-[10px] text-[#d8ceb2]/70 font-mono">
                <span>1 mi</span>
                <span>5 mi</span>
                <span>10 mi</span>
                <span>20 mi</span>
              </div>
            </div>

            {/* Price Level Filter */}
            <div>
              <label className="block text-xs font-semibold text-[#d8ceb2] mb-2">
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
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#22396f] text-[#fcf1d0] border border-[#fcf1d0]/60 shadow-xs'
                          : 'bg-[#010736] text-[#d8ceb2] hover:bg-[#010736]/80 border border-[#22396f]'
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
              <label className="block text-xs font-semibold text-[#d8ceb2] mb-2">
                Minimum Rating
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 4.5, 4.8].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFilters({ ...filters, minRating: rate })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      filters.minRating === rate
                        ? 'bg-[#22396f] text-[#fcf1d0] border border-[#fcf1d0]/60 shadow-xs'
                        : 'bg-[#010736] text-[#d8ceb2] hover:bg-[#010736]/80 border border-[#22396f]'
                    }`}
                  >
                    <Star size={11} className={filters.minRating === rate ? 'fill-[#fcf1d0] text-[#fcf1d0]' : 'text-[#d8ceb2] fill-[#d8ceb2]'} />
                    <span>{rate === 0 ? 'Any' : `${rate}+`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Switches */}
            <div className="space-y-3 pt-2 border-t border-[#22396f]">
              <label className="flex items-center justify-between text-xs text-[#d8ceb2] cursor-pointer">
                <span>Open Right Now</span>
                <input
                  type="checkbox"
                  checked={filters.openNowOnly}
                  onChange={(e) => setFilters({ ...filters, openNowOnly: e.target.checked })}
                  className="rounded text-[#22396f] focus:ring-[#fcf1d0] h-4 w-4 bg-[#010736] border-[#22396f]"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-[#d8ceb2] cursor-pointer">
                <span>Has Openings Today</span>
                <input
                  type="checkbox"
                  checked={filters.openingsTodayOnly}
                  onChange={(e) =>
                    setFilters({ ...filters, openingsTodayOnly: e.target.checked })
                  }
                  className="rounded text-[#22396f] focus:ring-[#fcf1d0] h-4 w-4 bg-[#010736] border-[#22396f]"
                />
              </label>
            </div>

            {/* Specific sub-services */}
            {availableSubServices.length > 0 && (
              <div className="pt-2 border-t border-[#22396f]">
                <label className="block text-xs font-semibold text-[#d8ceb2] mb-2">
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
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#22396f] text-[#fcf1d0] border border-[#fcf1d0]/70 font-bold'
                            : 'bg-[#010736] text-[#d8ceb2] hover:bg-[#22396f]/40 border border-[#22396f]'
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

        {/* Business List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#d8ceb2] pb-1">
            <span>
              Showing <b>{filteredAndSortedBusinesses.length}</b> providers within {filters.maxDistanceMiles} miles
            </span>
            <span className="font-semibold text-[#fcf1d0]">Sort: Distance Ascending</span>
          </div>

          <AnimatePresence>
            {filteredAndSortedBusinesses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0d1c42] rounded-2xl border border-[#22396f] p-12 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#010736] text-[#d8ceb2] mx-auto flex items-center justify-center mb-3 border border-[#22396f]">
                  <Filter size={20} />
                </div>
                <h3 className="text-sm font-bold text-[#fcf1d0]">No businesses match your filters</h3>
                <p className="text-xs text-[#d8ceb2] mt-1 max-w-sm mx-auto">
                  Try expanding your search distance or clearing some of the filters to see more providers.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-[#22396f] text-[#fcf1d0] font-semibold text-xs rounded-xl hover:bg-[#22396f]/80 transition-colors border border-[#22396f] cursor-pointer"
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
                  transition={{ duration: 0.15 }}
                  className="bg-[#0d1c42] rounded-2xl border border-[#22396f] p-5 shadow-md hover:border-[#fcf1d0]/40 transition-all flex flex-col md:flex-row gap-5"
                >
                  {/* Thumbnail */}
                  <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden shrink-0 relative bg-[#010736] border border-[#22396f]">
                    <img
                      src={biz.image}
                      alt={biz.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-[#010736]/90 backdrop-blur-xs text-[11px] font-bold text-[#fcf1d0] px-2 py-0.5 rounded-md border border-[#22396f] flex items-center space-x-1 font-mono">
                      <MapPin size={11} className="text-[#fcf1d0]" />
                      <span>{biz.distanceMiles.toFixed(1)} mi</span>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#fcf1d0] tracking-tight">
                            {biz.name}
                          </h3>
                          <p className="text-xs text-[#d8ceb2] mt-0.5">
                            {biz.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-[#fcf1d0] bg-[#010736] px-2 py-1 rounded-md border border-[#22396f]">
                            {formatPrice(biz.priceLevel)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 mt-2 text-xs">
                        <div className="flex items-center space-x-1 text-[#fcf1d0] font-bold">
                          <Star size={13} className="fill-[#fcf1d0] text-[#fcf1d0]" />
                          <span>{biz.rating}</span>
                          <span className="text-[#d8ceb2] font-normal">({biz.reviewCount})</span>
                        </div>
                        <span className="text-[#22396f]">•</span>
                        <div className="flex items-center space-x-1 text-[#d8ceb2]">
                          <Phone size={11} className="text-[#d8ceb2]" />
                          <span>{biz.phone}</span>
                        </div>
                        <span className="text-[#22396f]">•</span>
                        <div className="flex items-center space-x-1">
                          {biz.isOpenNow ? (
                            <span className="text-emerald-300 font-semibold flex items-center space-x-1">
                              <CheckCircle size={11} />
                              <span>Open Now</span>
                            </span>
                          ) : (
                            <span className="text-[#d8ceb2] flex items-center space-x-1">
                              <Clock size={11} />
                              <span>Closed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#d8ceb2] mt-2 line-clamp-2 leading-relaxed">
                        {biz.description}
                      </p>

                      {/* Services badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {biz.services.map((svc) => (
                          <span
                            key={svc.id}
                            className="text-[10px] font-medium bg-[#010736] text-[#fcf1d0] px-2 py-0.5 rounded-md border border-[#22396f]"
                          >
                            {svc.name} · ${(svc.priceCents / 100).toFixed(0)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Booking / Waitlist Footer */}
                    <div className="mt-4 pt-3 border-t border-[#22396f] flex items-center justify-between">
                      {biz.hasOpeningsToday ? (
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-300 font-medium">
                          <CheckCircle size={13} className="text-emerald-400" />
                          <span>
                            Openings: <b className="text-[#fcf1d0]">{biz.availableSlots.slice(0, 3).join(', ')}</b>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-medium">
                          <XCircle size={13} className="text-amber-400" />
                          <span>Fully booked today · Waitlist available</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {biz.hasOpeningsToday ? (
                          <button
                            onClick={() => onOpenBooking(biz)}
                            className="px-4 py-2 bg-[#22396f] hover:bg-[#22396f]/80 text-[#fcf1d0] text-xs font-bold rounded-xl border border-[#22396f] transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                          >
                            <Calendar size={12} />
                            <span>Book Slot</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenWaitlist(biz)}
                            className="px-4 py-2 bg-[#010736] hover:bg-[#22396f] text-[#fcf1d0] text-xs font-bold rounded-xl border border-[#22396f] transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                          >
                            <Clock size={12} />
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
