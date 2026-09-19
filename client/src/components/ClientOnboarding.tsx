import React from 'react';
import { motion } from 'framer-motion';
import type { CategoryInfo, ServiceCategory } from '../types';
import { CATEGORIES } from '../data/mockData';
import {
  Scissors,
  Wrench,
  Zap,
  Sparkles,
  Flower2,
  HeartHandshake,
  Sparkle,
  Car,
  ChevronRight,
  Search,
} from 'lucide-react';

interface ClientOnboardingProps {
  onSelectCategory: (category: ServiceCategory) => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Scissors':
      return <Scissors className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Wrench':
      return <Wrench className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Zap':
      return <Zap className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Flower2':
      return <Flower2 className="w-5 h-5 text-[#fcf1d0]" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Sparkle':
      return <Sparkle className="w-5 h-5 text-[#fcf1d0]" />;
    case 'Car':
      return <Car className="w-5 h-5 text-[#fcf1d0]" />;
    default:
      return <Search className="w-5 h-5 text-[#fcf1d0]" />;
  }
};

export const ClientOnboarding: React.FC<ClientOnboardingProps> = ({ onSelectCategory }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto text-[#fcf1d0]">
      {/* Hero Welcome */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="inline-block px-3 py-1 bg-[#0d1c42] text-[#fcf1d0] text-[11px] font-semibold rounded-full uppercase tracking-wider mb-3 border border-[#22396f]">
            Step 1: Choose Your Service
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#fcf1d0] sm:text-4xl">
            What service do you need today?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#d8ceb2] leading-relaxed">
            Dispatch bridges clients with local SMBs. Choose a category below to discover nearby providers, check live availability, or join automated waitlists.
          </p>
        </motion.div>
      </div>

      {/* Grid of Categories */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {CATEGORIES.map((cat: CategoryInfo) => (
          <motion.div
            key={cat.id}
            variants={itemVariants}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCategory(cat.id)}
            className="cursor-pointer rounded-2xl p-5 bg-[#0d1c42] hover:bg-[#0d1c42]/90 border border-[#22396f] hover:border-[#fcf1d0]/50 shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#22396f] flex items-center justify-center border border-[#22396f]">
                  {getCategoryIcon(cat.iconName)}
                </div>
                <div className="w-7 h-7 rounded-full bg-[#010736] flex items-center justify-center text-[#d8ceb2]">
                  <ChevronRight size={14} />
                </div>
              </div>

              <h3 className="text-base font-bold text-[#fcf1d0] mb-1">
                {cat.name}
              </h3>
              <p className="text-xs text-[#d8ceb2] leading-relaxed mb-4">
                {cat.description}
              </p>
            </div>

            {/* Popular service chips */}
            <div>
              <div className="text-[10px] font-semibold text-[#d8ceb2] uppercase tracking-wider mb-2">
                Popular Requests:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.popularServices.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium bg-[#010736] text-[#fcf1d0] px-2 py-0.5 rounded-md border border-[#22396f]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Crawl Agent & Categorizer explanation pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#0d1c42] rounded-full text-xs text-[#d8ceb2] border border-[#22396f]">
          <Sparkles size={13} className="text-[#fcf1d0]" />
          <span>
            <b>Crawler & Keyword Categorization Engine:</b> Categorizes SMBs across distance ranges with guaranteed 0 double bookings.
          </span>
        </div>
      </motion.div>
    </div>
  );
};
