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
      return <Scissors className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Wrench':
      return <Wrench className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Zap':
      return <Zap className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Flower2':
      return <Flower2 className="w-5 h-5 text-[#f7f3e8]" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Sparkle':
      return <Sparkle className="w-5 h-5 text-[#f7f3e8]" />;
    case 'Car':
      return <Car className="w-5 h-5 text-[#f7f3e8]" />;
    default:
      return <Search className="w-5 h-5 text-[#f7f3e8]" />;
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
    <div className="client-discover py-8 px-4 max-w-6xl mx-auto text-[#f7f3e8]">
      {/* Hero Welcome */}
      <div className="discover-intro text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="inline-block px-3 py-1 bg-[#101a30] text-[#f7f3e8] text-[11px] font-semibold rounded-full uppercase tracking-wider mb-3 border border-[#263751]">
            A LITTLE TIME FOR YOU
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#f7f3e8] sm:text-4xl">
            Find your next good thing.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#a3aec3] leading-relaxed">
            A fresh cut. A little self-care. That thing you’ve been putting off. Find a local expert and make time for what matters.
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
          <motion.button
            type="button"
            key={cat.id}
            variants={itemVariants}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCategory(cat.id)}
            className="category-card text-left cursor-pointer rounded-2xl p-5 bg-[#101a30] hover:bg-[#101a30]/90 border border-[#263751] hover:border-[#f7f3e8]/50 shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#263751] flex items-center justify-center border border-[#263751]">
                  {getCategoryIcon(cat.iconName)}
                </div>
                <div className="w-7 h-7 rounded-full bg-[#080e20] flex items-center justify-center text-[#a3aec3]">
                  <ChevronRight size={14} />
                </div>
              </div>

              <h3 className="text-base font-bold text-[#f7f3e8] mb-1">
                {cat.name}
              </h3>
              <p className="text-xs text-[#a3aec3] leading-relaxed mb-4">
                {cat.description}
              </p>
            </div>

            {/* Popular service chips */}
            <div>
              <div className="text-[10px] font-semibold text-[#a3aec3] uppercase tracking-wider mb-2">
                Popular Requests:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.popularServices.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium bg-[#080e20] text-[#f7f3e8] px-2 py-0.5 rounded-md border border-[#263751]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Crawl Agent & Categorizer explanation pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#101a30] rounded-full text-xs text-[#a3aec3] border border-[#263751]">
          <Sparkles size={13} className="text-[#f7f3e8]" />
          <span>
            Sample businesses and distances for exploring the client experience.
          </span>
        </div>
      </motion.div>
    </div>
  );
};
