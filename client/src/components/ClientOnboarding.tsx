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
      return <Scissors className="w-6 h-6 text-indigo-600" />;
    case 'Wrench':
      return <Wrench className="w-6 h-6 text-blue-600" />;
    case 'Zap':
      return <Zap className="w-6 h-6 text-amber-500" />;
    case 'Sparkles':
      return <Sparkles className="w-6 h-6 text-pink-600" />;
    case 'Flower2':
      return <Flower2 className="w-6 h-6 text-emerald-600" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-6 h-6 text-purple-600" />;
    case 'Sparkle':
      return <Sparkle className="w-6 h-6 text-teal-600" />;
    case 'Car':
      return <Car className="w-6 h-6 text-rose-600" />;
    default:
      return <Search className="w-6 h-6 text-slate-600" />;
  }
};

const getCategoryGradient = (catId: ServiceCategory) => {
  switch (catId) {
    case 'barber':
      return 'from-indigo-50/70 to-blue-50/40 border-indigo-100 hover:border-indigo-300';
    case 'plumber':
      return 'from-blue-50/70 to-cyan-50/40 border-blue-100 hover:border-blue-300';
    case 'electrician':
      return 'from-amber-50/70 to-yellow-50/40 border-amber-100 hover:border-amber-300';
    case 'salon':
      return 'from-pink-50/70 to-rose-50/40 border-pink-100 hover:border-pink-300';
    case 'spa':
      return 'from-emerald-50/70 to-teal-50/40 border-emerald-100 hover:border-emerald-300';
    case 'massage':
      return 'from-purple-50/70 to-violet-50/40 border-purple-100 hover:border-purple-300';
    case 'cleaning':
      return 'from-teal-50/70 to-emerald-50/40 border-teal-100 hover:border-teal-300';
    case 'auto_repair':
      return 'from-rose-50/70 to-orange-50/40 border-rose-100 hover:border-rose-300';
    default:
      return 'from-slate-50 to-slate-100 border-slate-200';
  }
};

export const ClientOnboarding: React.FC<ClientOnboardingProps> = ({ onSelectCategory }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto">
      {/* Hero Welcome */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3 border border-indigo-100">
            Step 1: Choose Your Service
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            What service do you need today?
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Dispatch connects you with top-rated local SMBs. Choose a category below to discover nearby providers, check live availability, or hop on automated waitlists.
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
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCategory(cat.id)}
            className={`cursor-pointer rounded-2xl p-5 bg-gradient-to-br ${getCategoryGradient(
              cat.id
            )} border shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                  {getCategoryIcon(cat.iconName)}
                </div>
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {cat.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {cat.description}
              </p>
            </div>

            {/* Popular service chips */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Popular Requests:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.popularServices.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium bg-white/90 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60"
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
        transition={{ delay: 0.4 }}
        className="mt-12 text-center"
      >
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100/90 rounded-full text-xs text-slate-600 border border-slate-200">
          <Sparkles size={14} className="text-indigo-500" />
          <span>
            <b>Crawler & Keyword Categorization Engine:</b> Automatically discovers SMB services, business hours, and categorizes crawl data.
          </span>
        </div>
      </motion.div>
    </div>
  );
};
