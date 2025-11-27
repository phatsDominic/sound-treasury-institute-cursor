"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, ShieldCheck, HardHat, Activity, 
  TrendingUp, FileText, Menu, X, Anchor, Factory, 
  Loader2, AlertCircle, RefreshCcw, Download, Settings, 
  Database, Trophy, LayoutDashboard, FlaskConical
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts';

import { generateStaticBtcHistory } from './utils/staticData';
import { calculateFairPrice, GENESIS_DATE, MODEL_COEFF, MODEL_EXPONENT, ONE_DAY_MS, PROJECT_TO_YEAR, downsampleData } from './utils/powerLaw';
import { SECTOR_CONFIG, START_YEAR } from './utils/sectorConfig';
import { buildComparisonSeries } from './utils/comparison';

// --- 1. CONSTANTS & CONFIGURATION ---

// Image Paths
const HERO_IMAGE_LOCAL = "/assets/industrial-refinery-hero.png";
const MONOCHROME_IMAGE_LOCAL = "/assets/industrial-monochrome.png";
const HERO_FALLBACK = "https://images.unsplash.com/photo-1518709911915-712d59df4634?q=80&w=2600&auto=format&fit=crop"; 
const MONOCHROME_FALLBACK = "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2672&auto=format&fit=crop";


// Comparison Assets
const SECTORS = {
  chemicals: {
    ...SECTOR_CONFIG.chemicals,
    icon: <FlaskConical className="text-purple-500" />
  },
  agriculture: {
    ...SECTOR_CONFIG.agriculture,
    icon: <Factory className="text-green-600" />
  }
} as const;

// --- 2. GLOBAL CACHE ---
// Cache data outside the component lifecycle so it persists across view changes
const GLOBAL_CACHE: {
  plData: any[] | null;
  chartData: any[] | null;
  plStats: { stdDev: number, rSquared: number, currentPrice: number | null, currentFairPrice: number | null, dataSource: string } | null;
  sectorData: Record<string, { years: any[], scoreboard: any[] }>;
} = {
  plData: null,
  chartData: null,
  plStats: null,
  sectorData: {}
};

// Helper to save/load from localStorage
const STORAGE_KEY = 'sound_money_btc_cache_v2';
const saveToStorage = (data: any, stats: any, chartData: any[]) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, stats, chartData, timestamp: Date.now() }));
    }
  } catch (e) { console.warn('Cache save failed', e); }
};

const loadFromStorage = () => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Valid for 24 hours
        if (Date.now() - parsed.timestamp < 1000 * 60 * 60 * 24) {
           return parsed;
        }
      }
    }
  } catch (e) { return null; }
  return null;
};

// --- 2. HELPERS ---

const formatPrice = (val: number | null) => !val ? '-' : val > 1000 ? `$${val.toLocaleString(undefined, {maximumFractionDigits: 0})}` : `$${val.toFixed(2)}`;

const formatCurrency = (val: number) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;

// --- 3. BASE COMPONENTS (Defined first to avoid ReferenceError) ---

const Button = ({ children, variant = "primary", className = "", onClick }: { children: React.ReactNode, variant?: "primary" | "secondary" | "outline", className?: string, onClick?: () => void }) => {
  const baseStyle = "inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-sm transition-all duration-200 shadow-sm";
  const variants = {
    primary: "border-transparent text-slate-900 bg-amber-500 hover:bg-amber-400 focus:ring-2 focus:ring-offset-2 focus:ring-amber-500",
    secondary: "border-slate-600 text-slate-200 bg-transparent hover:bg-slate-800 hover:border-slate-500 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500",
    outline: "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Section = ({ children, className = "", id = "" }: { children: React.ReactNode, className?: string, id?: string }) => (
  <div id={id} className={`py-20 px-4 sm:px-6 lg:px-8 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle, light = false }: { title: string, subtitle?: boolean, light?: boolean }) => (
  <div className="mb-12">
    <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <div className={`mt-4 w-24 h-1 ${light ? 'bg-amber-500' : 'bg-slate-900'}`}></div>
    )}
  </div>
);

const ImageWithFallback = ({ src, fallback, alt, className }: { src: string, fallback: string, alt: string, className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      onError={() => setImgSrc(fallback)} 
    />
  );
};

// --- 4. LAYOUT COMPONENTS ---

const Navbar = ({ currentView, setView }: { currentView: string, setView: (view: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navLinks = [
    { label: 'Home', view: 'home' },
    { label: 'About This Project', view: 'executives' },
    { label: 'Data & Models', view: 'data' },
    { label: 'FAQ', view: 'home', section: 'faq' },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
            <Factory className="h-8 w-8 text-amber-500 mr-3" />
            <span className="text-white text-xl font-bold tracking-tight">The Sound Treasury <span className="text-slate-400 font-light">Institute</span></span>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setView(link.view);
                    if(link.section) setTimeout(() => {
                         const el = document.getElementById(link.section);
                         if(el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={`${currentView === link.view ? 'text-amber-500' : 'text-slate-300 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setView(link.view);
                  setIsOpen(false);
                }}
                className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-auto w-full">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 pb-8 border-b border-slate-800 text-center">
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          This is a personal research project. It is not a business, advisory service, or commercial offering.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="col-span-1 md:col-span-2">
           <div className="flex items-center mb-4">
            <Factory className="h-6 w-6 text-amber-600 mr-2" />
            <span className="text-white text-lg font-bold">The Sound Treasury Institute</span>
          </div>
          <p className="text-sm text-slate-500 max-w-sm">
            Strategy, data, and frameworks for industrial businesses facing rising monetary and credit uncertainty.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>info@soundmoneytreasury.org</li>
            <li>Omaha, NE</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-900 pt-8 text-xs text-slate-600 space-y-4">
        <h5 className="text-slate-500 font-bold uppercase tracking-wider">Disclaimer</h5>
        <p>The information on this website is provided for educational and informational purposes only and does not constitute investment, legal, tax, or accounting advice.</p>
        <p>Nothing on this site is an offer to buy or sell any security, commodity, or other financial instrument.</p>
        <p className="mt-4">&copy; {new Date().getFullYear()} The Sound Treasury Institute. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

// --- 5. PAGE VIEWS ---

const HomeView = ({ setView }: { setView: (view: string) => void }) => (
  <>
    <div className="relative bg-slate-900 overflow-hidden min-h-[600px] flex items-center">
      <div className="absolute inset-0">
        <ImageWithFallback 
          src={HERO_IMAGE_LOCAL} 
          fallback={HERO_FALLBACK}
          alt="Modern Industrial Chemical Facility" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
        <div className="lg:w-2/3">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl mb-6 drop-shadow-lg">
            Industrial Capital, <br className="hidden md:block" />
            <span className="text-amber-500">Rewired</span> for a New Monetary Era
          </h1>
          <p className="mt-4 text-xl text-slate-200 max-w-3xl leading-relaxed drop-shadow-md">
            Strategy, data, and frameworks designed for industrial and chemical businesses navigating rising monetary and credit uncertainty.
          </p>
          <p className="text-lg text-amber-500 font-medium mt-4 drop-shadow">
            Independent research on long-horizon capital and treasury resilience.
          </p>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm border-t border-slate-700/50 pt-6">
            <div className="flex items-center space-x-3">
              <HardHat className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Built by operators, not influencers</span>
            </div>
            <div className="flex items-center space-x-3">
              <Factory className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Designed for capital-intensive businesses</span>
            </div>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Focused on balance-sheet resilience</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Section className="bg-white">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <SectionTitle title="Who We Are" />
          <div className="text-lg text-slate-600 mb-6 space-y-4">
            <p>We focus on one intersection: <strong className="text-slate-900">industrial and chemical businesses × corporate treasury × long-horizon capital resilience.</strong></p>
            <p>We speak the language of uptime, safety, and reliability; working capital, capex, and ROIC; boards, lenders, and regulators.</p>
          </div>
          <div className="bg-slate-50 p-6 border-l-4 border-amber-500">
            <p className="font-semibold text-slate-900">We are not an asset manager and we don’t sell trading products.</p>
            <p className="text-slate-600 mt-2">Our job is simpler and harder: Help serious operators design balance sheets that can survive—and take advantage of—a more unstable monetary and credit environment.</p>
          </div>
        </div>
        <div className="bg-slate-100 p-8 rounded-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">The Operator's Reality</h3>
          <ul className="space-y-4">
            {["Rising raw material volatility", "Unpredictable cost of capital", "Long-cycle CaPex vs Short-cycle Rates", "Pension and liability matching"].map((item, i) => (
              <li key={i} className="flex items-center text-slate-700">
                <div className="h-2 w-2 bg-amber-500 rounded-full mr-3"></div>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-50 border-t border-slate-200">
      <SectionTitle title="What We Do" />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <FileText className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Executive Primers</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Short, direct briefings for CEOs, CFOs, and boards on how the current monetary regime impacts industrial businesses.</p>
          <span className="text-amber-600 text-sm font-semibold">No jargon. No ideology.</span>
        </div>
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <ShieldCheck className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Treasury Frameworks</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Structured ways to stress-test balance sheets against inflation and credit stress, and frame new approaches within fiduciary constraints.</p>
          <span className="text-amber-600 text-sm font-semibold">Protect the engine.</span>
        </div>
        <div onClick={() => setView('data')} className="cursor-pointer bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <BarChart3 className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Data & Dashboards</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Long-horizon views, valuation regime models for hard assets, and sector benchmarks. Designed so you can see assumptions.</p>
          <span className="text-amber-600 text-sm font-semibold">Adapt to your environment.</span>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-900 text-white">
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <SectionTitle title="Why This Matters Now" light={true} />
          <div className="text-lg text-slate-300 mb-8 space-y-4 max-w-prose">
            <p>Industrial and chemical businesses are built on long cycles: multi-year capex programs, long-term supply agreements, and balance sheets that must survive credit cycles.</p>
            <p>These are not entities that can pivot quarterly.</p>
          </div>
          <div className="space-y-6">
            <div className="flex"><TrendingUp className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">The Backdrop is Shifting</h4><p className="text-slate-400 text-sm mt-1">Aggressive policy moves, volatile real yields, and pressure on long-term obligations.</p></div></div>
            <div className="flex"><Anchor className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">A New Stable Anchor</h4><p className="text-slate-400 text-sm mt-1">A resilient balance sheet gives you a more stable anchor for reserves and changes how you think about retained earnings.</p></div></div>
            <div className="flex"><Activity className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">Intelligent Conversation</h4><p className="text-slate-400 text-sm mt-1">We exist to make the conversation with boards and owners intelligent, data-driven, and grounded in reality.</p></div></div>
          </div>
        </div>
        <div className="relative h-full min-h-[400px] bg-slate-800 rounded-sm border border-slate-700 p-1 flex flex-col justify-center overflow-hidden">
            <ImageWithFallback 
              src={MONOCHROME_IMAGE_LOCAL} 
              fallback={MONOCHROME_FALLBACK}
              alt="Industrial Resilience" 
              className="w-full h-full object-cover rounded-sm opacity-90 hover:opacity-100 transition-opacity duration-500"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded backdrop-blur-sm">
               <p className="text-white text-xs font-serif italic">"The goal isn’t to bet the company. The goal is to extend your planning horizon."</p>
            </div>
        </div>
      </div>
    </Section>

    <Section className="bg-white">
      <SectionTitle title="Who We Work With" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "CEOs & Founders", desc: "Of industrial and chemical companies." },
          { title: "CFOs & Treasury", desc: "Leaders responsible for liquidity and risk." },
          { title: "Board Members", desc: "Owners who think in decades, not quarters." },
          { title: "Investors", desc: "Seeking a hard-asset lens on capital-intensive business." },
        ].map((item, i) => (
            <div key={i} className="border-t-4 border-slate-200 pt-4">
                <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
                <p className="text-slate-600 mt-2 text-sm">{item.desc}</p>
            </div>
        ))}
      </div>
      <div className="mt-12 text-center p-8 bg-slate-50 rounded-lg max-w-3xl mx-auto">
          <p className="text-lg text-slate-800 font-medium">If you’re responsible for real assets, real people, and real P&Ls—and you’re re-thinking how your balance sheet is built—we built this for you.</p>
      </div>
    </Section>

    <Section className="bg-slate-100">
      <div className="max-w-4xl mx-auto">
        <SectionTitle title="How We Work" />
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">1</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Clarify Your Reality</h3>
                    <p className="text-slate-600 mt-2">Start with your actual balance sheet, cash flows, and constraints—no theoretical templates.</p>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">2</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Map the Options</h3>
                    <p className="text-slate-600 mt-2">Use data and frameworks to explore how different reserve and hard-asset strategies could behave under a range of scenarios.</p>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">3</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Equip the Decision-Makers</h3>
                    <p className="text-slate-600 mt-2">Help boards, lenders, and key executives see the trade-offs clearly so whatever you decide is informed, defensible, and aligned.</p>
                </div>
            </div>
        </div>
      </div>
    </Section>

    <Section id="faq" className="bg-white">
      <SectionTitle title="Frequently Asked Questions" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Do you recommend Bitcoin?</h4>
                <p className="text-slate-600 text-sm">No. We don’t recommend assets. This project is strictly research-focused and explores long-horizon capital resilience across inflation, credit stress, liquidity, and multi-decade industrial cycles.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Is this investment advice?</h4>
                <p className="text-slate-600 text-sm">No. All content on this site is for educational and informational purposes only. We do not provide individualized investment, legal, tax, or accounting advice.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Do you manage assets or run a fund?</h4>
                <p className="text-slate-600 text-sm">No. We do not manage assets, run a fund, or solicit capital. Our focus is on research, education, and strategic frameworks.</p>
            </div>
        </div>
        <div className="space-y-8">
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Why focus on industrial and chemical businesses?</h4>
                <p className="text-slate-600 text-sm">These businesses are capital-intensive, long-cycle, and highly sensitive to both monetary policy and commodity dynamics. They stand to benefit the most from stronger balance-sheet architecture.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Are you trying to convince every company to adopt this?</h4>
                <p className="text-slate-600 text-sm">No. Some balance sheets and ownership structures are not a good fit. Our goal is to help you see the trade-offs clearly so that if you say “yes” or “no,” it’s for the right reasons.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Can we reuse your models and charts?</h4>
                <p className="text-slate-600 text-sm">In general, yes, with proper attribution. If you want to incorporate them into internal board materials, we encourage you to cite the source and keep the methodology visible.</p>
            </div>
        </div>
      </div>
    </Section>
  </>
);

const ExecutivesView = ({ setView }: { setView: (view: string) => void }) => (
  <>
    <div className="bg-slate-900 py-24 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-amber-900/30 border border-amber-700 text-amber-500 text-xs font-bold tracking-wider uppercase mb-6">
            About This Project
        </span>
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl max-w-4xl mx-auto mb-6">
          A Hard-Money Lens for <br /><span className="text-slate-400">Industrial Balance Sheets</span>
        </h1>
        <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          A direct, data-driven view of how Bitcoin behaves over long horizons—and how it can (and cannot) fit into the treasury and capital structure of industrial and chemical businesses.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={() => setView('data')}>View the Models & Dashboards</Button>
          <Button variant="secondary" onClick={() => { const el = document.getElementById('exec-overview'); if(el) el.scrollIntoView({behavior:'smooth'}) }}>
            Read the Executive Overview
          </Button>
        </div>
        <p className="mt-8 text-sm text-slate-500">Built for leaders responsible for real assets, real people, and real P&Ls.</p>
      </div>
    </div>

    <Section id="exec-overview" className="bg-white">
      <SectionTitle title="What This Is (and Isn't)" />
      <div className="grid md:grid-cols-2 gap-0 border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 p-10 border-b md:border-b-0 md:border-r border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-green-600" /> What This Is
          </h3>
          <ul className="space-y-4">
            {[
              "A practitioner’s framework for hard monetary assets.",
              "Long-horizon data and models.",
              "Connecting industrial reality with monetary reality.",
              "A resource to circulate internally to boards."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-700">
                <span className="text-green-600 font-bold mr-3">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <X className="w-6 h-6 mr-2 text-red-500" /> What This Is Not
          </h3>
          <ul className="space-y-4">
            {[
              "Not trading tips, memes, or predictions.",
              "Not a fund pitch or ask for capital.",
              "Not a recommendation to 'go all in'.",
              "Not a substitute for your legal/tax teams."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-700">
                <span className="text-red-500 font-bold mr-3">×</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Why CEOs, CFOs, and Boards Are Looking at Bitcoin</h2>
        <div className="prose prose-lg text-slate-600">
          <p className="mb-4">Senior leaders in industrial and chemical businesses are starting to ask:</p>
          <ul className="list-disc pl-6 mb-8 space-y-2 bg-white p-6 rounded-md shadow-sm border border-slate-200">
            <li>What happens to our cash, reserves, and pensions if monetary expansion continues at this pace?</li>
            <li>How do we protect long-term obligations in a world of volatile real yields?</li>
            <li>Is there a role for a hard, digitally native asset with a transparent issuance schedule alongside our fiat reserves?</li>
          </ul>
          <p className="mb-6">Bitcoin will not fix operations, culture, or strategy. But as a hard monetary asset, it can serve as a long-duration store of value, change the conversation around retained earnings, and provide a contrast to purely fiat-based reserves in board-level risk discussions.</p>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-900 text-white">
      <SectionTitle title="How It Can Fit" subtitle light={true} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">1. Strategic Reserves</h3>
          <p className="text-slate-400 text-sm mb-4">A modest, clearly-sized allocation alongside cash and short-duration instruments.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Preserves liquidity</li><li>• Anchor for long-term value</li><li>• Governed by strict thresholds</li></ul>
        </div>
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">2. Optionality Pool</h3>
          <p className="text-slate-400 text-sm mb-4">A separate “optionality bucket” funded from retained earnings.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Explicitly risk capital</li><li>• 5–10+ year horizons</li><li>• Build long-term resilience</li></ul>
        </div>
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">3. Board-Level Lens</h3>
          <p className="text-slate-400 text-sm mb-4">Even before purchasing, the analysis itself creates value.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Forces clarity on time horizons</li><li>• Highlights hidden fiat risks</li><li>• Sharpens treasury strategy</li></ul>
        </div>
      </div>
    </Section>

    <Section className="bg-white">
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <SectionTitle title="The Models Behind Our View" />
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Long-Horizon Fair-Value</h4>
              <p className="text-slate-600 mt-2">We use power-law models to estimate a long-term “fair value” trajectory. These models are evaluated in log space, where Bitcoin’s behavior is statistically meaningful.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Lower-Valuation Regimes</h4>
              <p className="text-slate-600 mt-2">We pay attention to periods when market price is in the lowest band relative to the model. Historically, these are the most favorable entry points for accumulators.</p>
            </div>
          </div>
          <div className="mt-8">
            <Button onClick={() => setView('data')}>Open the Hard-Money Dashboard</Button>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 flex flex-col items-center justify-center">
             <div className="w-full h-64 relative border-l border-b border-slate-300">
                <div className="absolute bottom-0 left-0 w-full h-full p-4">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                        <path d="M0,50 Q20,40 50,20 T100,5" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                        <path d="M0,50 L10,45 L15,48 L25,35 L30,40 L40,25 L50,15 L60,20 L70,10 L80,12 L90,5 L100,2" fill="none" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                </div>
             </div>
             <p className="text-xs text-slate-500 mt-4 text-center">Interactive charts allow you to stress-test assumptions and compare against industrial indices.</p>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-100">
      <SectionTitle title="Questions for Your Next Board Meeting" />
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
        <ul className="space-y-6">
          {[
            "What portion of our balance sheet is truly long-term capital versus working capital?",
            "How are we currently protecting that long-term capital from monetary debasement?",
            "Have we explicitly considered a small, governed allocation to a hard monetary asset?",
            "If not, is that because we evaluated it and declined, or simply haven’t had the discussion?",
            "What governance and risk limits would we require before considering any allocation?"
          ].map((q, i) => (
            <li key={i} className="flex items-start">
               <span className="text-amber-500 font-bold mr-4 text-xl">?</span>
               <span className="text-slate-800 font-medium text-lg">{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  </>
);

const DataModelsView = () => {
  const [activeTab, setActiveTab] = useState('powerLaw');
  const [activeSector, setActiveSector] = useState<'chemicals' | 'agriculture'>('chemicals');
  const staticFallback = useMemo(() => generateStaticBtcHistory(), []);
  const initialPlData = GLOBAL_CACHE.plData || staticFallback;
  const initialChartData = GLOBAL_CACHE.chartData || downsampleData(initialPlData, 800);
  const initialComparison = useMemo(() => {
    const historyClone = SECTORS.chemicals.staticHistory ? JSON.parse(JSON.stringify(SECTORS.chemicals.staticHistory)) : {};
    return buildComparisonSeries(historyClone, SECTORS.chemicals.assets);
  }, []);

  const [plData, setPlData] = useState<any[]>(initialPlData);
  const [chartData, setChartData] = useState<any[]>(initialChartData);
  const [plLoading, setPlLoading] = useState(!GLOBAL_CACHE.plData);
  const [plError, setPlError] = useState<string | null>(null);
  const [plDataSource, setPlDataSource] = useState(GLOBAL_CACHE.plStats?.dataSource || 'Initializing...');
  const [compData, setCompData] = useState<any[]>(initialComparison.years);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<any[]>(initialComparison.scoreboard); 
  const [yScale, setYScale] = useState<'log' | 'linear'>('log');
  const [xScale, setXScale] = useState<'date' | 'log-days'>('date');
  const [currentPrice, setCurrentPrice] = useState<number | null>(GLOBAL_CACHE.plStats?.currentPrice || null);
  const [currentFairPrice, setCurrentFairPrice] = useState<number | null>(GLOBAL_CACHE.plStats?.currentFairPrice || null);
  const [stdDev, setStdDev] = useState(GLOBAL_CACHE.plStats?.stdDev || 0);
  const [rSquared, setRSquared] = useState(GLOBAL_CACHE.plStats?.rSquared || 0); 
  
  // ... existing state ...

  const formatXAxis = (val: number) => {
    if (xScale === 'date') return new Date(val).getFullYear().toString();
    const date = new Date(GENESIS_DATE + val * ONE_DAY_MS);
    return date.getFullYear().toString();
  };

  const formatTooltipDate = (label: number) => {
    const date = xScale === 'date' ? new Date(label) : new Date(GENESIS_DATE + label * ONE_DAY_MS);
    return date.toLocaleDateString();
  };

  const loadPlDemoData = () => {
    const demoData = [];
    const now = Date.now();
    const targetDateMs = new Date(`${PROJECT_TO_YEAR}-12-31`).getTime();
    const daysTotal = (targetDateMs - GENESIS_DATE) / ONE_DAY_MS;
    const fakeStdDev = 0.6; 
    setStdDev(fakeStdDev);
    setRSquared(0.92);

    for (let i = 500; i < daysTotal; i += 30) {
      const timestamp = GENESIS_DATE + (i * ONE_DAY_MS);
      const fair = calculateFairPrice(i);
      let simulatedPrice = null;
      if (timestamp <= now) {
          const cycle = Math.sin(i / 600) * 1.5; 
          const noise = (Math.random() - 0.5) * 0.2;
          simulatedPrice = fair * Math.exp(cycle + noise);
      }
      demoData.push({
        date: timestamp,
        price: simulatedPrice,
        fairPrice: fair,
        daysSinceGenesis: i,
        upperBand: fair * Math.exp(2 * fakeStdDev),
        lowerBand: fair * Math.exp(-1 * fakeStdDev)
      });
    }
    setPlData(demoData);
    setChartData(downsampleData(demoData, 800));
    const lastReal = demoData.filter(d => d.price !== null).pop();
    if(lastReal) {
        setCurrentPrice(lastReal.price);
        setCurrentFairPrice(lastReal.fairPrice);
    }
  };

  const fetchPowerLawData = async (forceRefresh = false) => {
    if (!forceRefresh && GLOBAL_CACHE.plData && GLOBAL_CACHE.plStats && GLOBAL_CACHE.chartData) {
        setPlData(GLOBAL_CACHE.plData);
        setChartData(GLOBAL_CACHE.chartData);
        setStdDev(GLOBAL_CACHE.plStats.stdDev);
        setRSquared(GLOBAL_CACHE.plStats.rSquared);
        setCurrentPrice(GLOBAL_CACHE.plStats.currentPrice);
        setCurrentFairPrice(GLOBAL_CACHE.plStats.currentFairPrice);
        setPlDataSource(GLOBAL_CACHE.plStats.dataSource);
        setPlLoading(false);
        return;
    }

    if (!forceRefresh) {
      const stored = loadFromStorage();
      if (stored?.data && stored?.stats) {
        const resolvedChart = stored.chartData?.length ? stored.chartData : downsampleData(stored.data, 800);
        GLOBAL_CACHE.plData = stored.data;
        GLOBAL_CACHE.plStats = stored.stats;
        GLOBAL_CACHE.chartData = resolvedChart;
        setPlData(stored.data);
        setChartData(resolvedChart);
        setStdDev(stored.stats.stdDev);
        setRSquared(stored.stats.rSquared);
        setCurrentPrice(stored.stats.currentPrice);
        setCurrentFairPrice(stored.stats.currentFairPrice);
        setPlDataSource(`${stored.stats.dataSource} (cached)`);
        setPlLoading(false);
        return;
      }
    }

    setPlLoading(true);
    setPlError(null);

    try {
      const response = await fetch('/api/btc');
      if (!response.ok) throw new Error('Failed to fetch BTC data');
      const payload = await response.json();
      if (!payload?.data || !payload?.stats) throw new Error('Invalid BTC payload');

      const resolvedChart = payload.chartData?.length ? payload.chartData : downsampleData(payload.data, 800);
      GLOBAL_CACHE.plData = payload.data;
      GLOBAL_CACHE.chartData = resolvedChart;
      GLOBAL_CACHE.plStats = payload.stats;
      saveToStorage(payload.data, payload.stats, resolvedChart);

      setPlData(payload.data);
      setChartData(resolvedChart);
      setStdDev(payload.stats.stdDev);
      setRSquared(payload.stats.rSquared);
      setCurrentPrice(payload.stats.currentPrice);
      setCurrentFairPrice(payload.stats.currentFairPrice);
      setPlDataSource(`${payload.stats.dataSource}${payload.stats.verification?.matches === false ? ' (verify)' : ''}`);
    } catch (err) {
      console.error(err);
      setPlError(`Live data unavailable. Using simulated data.`);
      setPlDataSource('Demo Data (Simulation)');
      loadPlDemoData();
    } finally {
      setPlLoading(false);
    }
  };

  const fetchComparisonData = async (sectorKey: 'chemicals' | 'agriculture' = activeSector, forceRefresh = false) => {
    if (!forceRefresh && GLOBAL_CACHE.sectorData[sectorKey]) {
      if (sectorKey === activeSector) {
        setCompData(GLOBAL_CACHE.sectorData[sectorKey].years);
        setScoreboard(GLOBAL_CACHE.sectorData[sectorKey].scoreboard);
      }
      return;
    }

    if (!GLOBAL_CACHE.sectorData[sectorKey]) {
      const fallback = buildStaticComparison(sectorKey);
      if (sectorKey === activeSector) {
        setCompData(fallback.years);
        setScoreboard(fallback.scoreboard);
      }
    }

    setCompLoading(true);
    setCompError(null);
    
    try {
      const response = await fetch(`/api/sector/${sectorKey}`);
      if (!response.ok) throw new Error('Failed to fetch sector data');
      const payload = await response.json();
      if (!payload?.years || !payload?.scoreboard) throw new Error('Invalid sector payload');
      GLOBAL_CACHE.sectorData[sectorKey] = { years: payload.years, scoreboard: payload.scoreboard };
      if (sectorKey === activeSector) {
        setCompData(payload.years);
        setScoreboard(payload.scoreboard);
      }
    } catch (err) {
      console.error(err);
      setCompError("Could not fetch latest data. Showing static history.");
      const fallback = buildStaticComparison(sectorKey);
      GLOBAL_CACHE.sectorData[sectorKey] = fallback;
      if (sectorKey === activeSector) {
        setCompData(fallback.years);
        setScoreboard(fallback.scoreboard);
      }
    } finally {
      setCompLoading(false);
    }
  };

  const buildStaticComparison = (sectorKey: 'chemicals' | 'agriculture') => {
    const sectorConfig = SECTORS[sectorKey];
    const historyData: Record<number, Record<string, any>> = sectorConfig.staticHistory
      ? JSON.parse(JSON.stringify(sectorConfig.staticHistory))
      : {};
    return buildComparisonSeries(historyData, sectorConfig.assets);
  };

  useEffect(() => { fetchPowerLawData(); }, []);
  useEffect(() => { 
    if (activeTab === 'comparison') { 
      fetchComparisonData(activeSector); 
    } 
  }, [activeTab, activeSector]);

  const downloadPlCSV = () => {
    if (!plData.length) return;
    const headers = ["Date", "Days", "Price", "Fair Value", "+2 SD", "-1 SD"];
    const rows = plData.map(row => [
      new Date(row.date).toISOString().split('T')[0],
      row.daysSinceGenesis.toFixed(2),
      row.price || "",
      row.fairPrice.toFixed(2),
      row.upperBand.toFixed(2),
      row.lowerBand.toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "btc_power_law.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-grow bg-slate-950 text-slate-200 w-full flex flex-col">
      <div className="w-full px-6 py-8 flex-grow">
        <div className="w-full max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-800 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><LayoutDashboard className="text-amber-500" />Hard Money Dashboard</h2>
                 <div className="h-6 w-px bg-slate-700 mx-2"></div>
                 <div className="flex bg-slate-900 border border-slate-700 rounded-md p-1">
                   <button onClick={() => setActiveTab('powerLaw')} className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'powerLaw' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Power Law Model</button>
                   <button onClick={() => setActiveTab('comparison')} className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'comparison' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Industrial Race</button>
                 </div>
                 {activeTab === 'comparison' && (
                   <div className="flex bg-slate-900 border border-slate-700 rounded-md p-1 ml-2">
                      {(Object.keys(SECTORS) as Array<keyof typeof SECTORS>).map(sector => (
                        <button
                          key={sector}
                          onClick={() => {
                            // Clear data briefly to avoid data/label mismatch during switch if not cached
                            if (activeSector !== sector && !GLOBAL_CACHE.sectorData[sector]) {
                                setCompData([]); 
                            }
                            setActiveSector(sector);
                          }}
                          className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSector === sector ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {SECTORS[sector].icon} {SECTORS[sector].label}
                        </button>
                      ))}
                   </div>
                 )}
             </div>
             <button
               onClick={() => activeTab === 'powerLaw' ? fetchPowerLawData(true) : fetchComparisonData(activeSector, true)}
               className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
               title="Refresh Data"
             >
               <RefreshCcw size={18} />
             </button>
          </div>

          {activeTab === 'powerLaw' ? (
             <div className="space-y-6 animate-in fade-in duration-500 w-full">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white border-l-4 border-amber-500 pl-4">Research Dashboard: Long-Horizon Reserve Models</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Actual Price</p><div className="text-2xl font-bold text-white">{currentPrice ? `$${currentPrice.toLocaleString()}` : '---'}</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Fair Value (Model)</p><div className="text-2xl font-bold text-blue-400">{currentFairPrice ? `$${Math.round(currentFairPrice).toLocaleString()}` : '---'}</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Deviation</p><div className={`text-2xl font-bold ${((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0) > 0 ? '+' : ''}{((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0).toFixed(1)}%</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Std Dev (σ)</p><div className="text-2xl font-bold text-purple-400">{stdDev.toFixed(3)}</div><div className="text-[10px] text-slate-500">Log-price residuals</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">R-Squared (R²)</p><div className="text-2xl font-bold text-cyan-400">{rSquared.toFixed(4)}</div><div className="text-[10px] text-slate-500">Model Fit (Log-Log)</div></div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-2 w-full">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Database size={14} />Source: <span className={`${plDataSource.includes('Demo') ? 'text-yellow-500' : 'text-green-400'} font-medium`}>{plDataSource}</span></div>
                  <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span>Y-Axis</span><div className="flex bg-slate-900 border border-slate-800 rounded overflow-hidden"><button onClick={() => setYScale('log')} className={`px-2 py-1 ${yScale === 'log' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Log</button><button onClick={() => setYScale('linear')} className={`px-2 py-1 ${yScale === 'linear' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Lin</button></div></div></div>
                      <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span>X-Axis</span><div className="flex bg-slate-900 border border-slate-800 rounded overflow-hidden"><button onClick={() => setXScale('log-days')} className={`px-2 py-1 ${xScale === 'log-days' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Log</button><button onClick={() => setXScale('date')} className={`px-2 py-1 ${xScale === 'date' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Time</button></div></div></div>
                  </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[60vh] min-h-[600px] shadow-2xl relative flex flex-col w-full">
                  <div className="flex justify-between items-center mb-2 px-2">
                      <h2 className="text-sm font-semibold text-slate-400">BTC Power Law Projection (2009 - {PROJECT_TO_YEAR})</h2>
                      <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400/50"/> +2σ (Upper)</span>
                          <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400"/> Model</span>
                          <span className="flex items-center gap-1 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400/50"/> -1σ (Lower)</span>
                      </div>
                  </div>
                  {plLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3"><Loader2 className="animate-spin" size={32} /><p>Fetching Power Law data...</p></div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                      <XAxis dataKey={xScale === 'date' ? 'date' : 'daysSinceGenesis'} tickFormatter={formatXAxis} stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={50} type="number" scale={xScale === 'date' ? 'time' : 'log'} domain={['dataMin', 'dataMax']} allowDataOverflow={true}/>
                      <YAxis scale={yScale} domain={['auto', 'auto']} tickFormatter={formatCurrency} stroke="#64748b" tick={{ fontSize: 11 }} width={60} allowDataOverflow={true}/>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }} labelFormatter={formatTooltipDate} formatter={(value, name) => { if (value === null) return ['-', name]; let label = name; if (name === 'upperBand') label = 'Upper Band (+2σ)'; if (name === 'lowerBand') label = 'Lower Band (-1σ)'; return [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, label]; }}/>
                      <Line type="monotone" dataKey="upperBand" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} name="upperBand" />
                      <Line type="monotone" dataKey="lowerBand" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} name="lowerBand" />
                      <Line type="monotone" dataKey="fairPrice" stroke="#60a5fa" strokeWidth={2} dot={false} name="Fair Value" isAnimationActive={false} />
                      <Line type="monotone" dataKey="price" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Actual Price" isAnimationActive={false} connectNulls={false} />
                      </ComposedChart>
                  </ResponsiveContainer>
                  )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400 bg-slate-900/30 p-6 rounded-xl border border-slate-800 w-full">
                  <div><h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Settings size={14} /> Model Settings</h3><ul className="space-y-1 list-disc list-inside text-slate-500 text-xs"><li>Coeff: {MODEL_COEFF}</li><li>Exponent: {MODEL_EXPONENT}</li></ul></div>
                  <div className="flex items-end justify-end"><button onClick={downloadPlCSV} className="flex items-center gap-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-md transition-colors border border-slate-700"><Download size={14} /> Export CSV</button></div>
              </div>
             </div>
          ) : (
              <div className="space-y-8 animate-in fade-in duration-500 w-full">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white border-l-4 border-amber-500 pl-4">Industry Cycle Comparison: 2010–2025</h2></div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl text-center"><h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">{SECTORS[activeSector].icon} Bitcoin vs. {SECTORS[activeSector].label} Industry</h2><p className="text-slate-400 text-sm max-w-2xl mx-auto">Year-over-Year (YoY) growth comparison starting from {START_YEAR}. Tracks Bitcoin against major {activeSector} companies.</p></div>
              {compLoading && (<div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4"><Loader2 className="animate-spin" size={48} /><p>Crunching historical data for {activeSector} assets...</p></div>)}
              {compError && (<div className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-200 p-6 rounded-lg text-center"><AlertCircle className="mx-auto mb-2" size={32} />{compError}</div>)}
              {!compLoading && (
                  <>
                  <div className="grid grid-cols-1 gap-6 w-full">
                      {compData.map((yearData) => (
                      <div key={yearData.year} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                          <span className="font-bold text-white text-lg">{yearData.year}</span>
                          {yearData.winner && (<span className="text-xs font-medium px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 flex items-center gap-1"><Trophy size={12} />Winner: {yearData.winner.name}</span>)}
                          </div>
                          <div className="p-4"><div className="flex flex-col gap-2">
                              {yearData.returns.map((item: any, idx: number) => (
                              <div key={item.symbol} className="relative flex items-center h-10">
                                  <div className="w-24 text-xs font-medium text-slate-400 shrink-0 truncate pr-2 flex flex-col justify-center"><span>{item.name}</span></div>
                                  <div className="w-28 text-[10px] text-slate-500 shrink-0 flex flex-col justify-center mr-2 border-l border-slate-800 pl-2 leading-tight">
                                      {item.startPrice !== null ? (<><div className="flex justify-between"><span className="text-slate-600 mr-1">Start:</span><span className="text-slate-300">{formatPrice(item.startPrice)}</span></div><div className="flex justify-between"><span className="text-slate-600 mr-1">End:</span><span className="text-slate-300">{formatPrice(item.endPrice)}</span></div></>) : <span className="text-slate-700">--</span>}
                                  </div>
                                  <div className="flex-1 h-6 bg-slate-800/50 rounded-r-sm relative overflow-hidden flex items-center">
                                  {item.value !== null ? (<><div className="h-full absolute left-0 top-0 opacity-80 transition-all duration-500" style={{ width: `${Math.min(Math.abs(item.value), 100)}%`, backgroundColor: item.value >= 0 ? item.color : '#ef4444' }}/><span className="relative z-10 ml-2 text-xs font-bold text-white drop-shadow-md">{item.value > 0 ? '+' : ''}{item.value.toFixed(1)}%</span></>) : (<span className="ml-2 text-xs text-slate-600 italic">N/A</span>)}
                                  </div>
                              </div>
                              ))}
                          </div></div>
                      </div>
                      ))}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8 w-full">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4"><Trophy className="text-yellow-500" />Decade Scoreboard ({START_YEAR} - Present)</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                          {Array.isArray(scoreboard) && scoreboard.map((item, index) => (
                          <div key={item.symbol} className={`relative p-4 rounded-lg border flex flex-col items-center text-center ${index === 0 ? 'bg-yellow-900/10 border-yellow-500/50' : 'bg-slate-800/30 border-slate-700'}`}>
                              {index === 0 && <div className="absolute -top-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">CHAMPION</div>}
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mb-2 shadow-lg" style={{ backgroundColor: item.color }}>{item.symbol === 'BTC-USD' ? '₿' : item.symbol[0]}</div>
                              <div className="text-2xl font-bold text-white">{item.count}</div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Wins</div>
                              <div className="text-xs font-medium text-slate-300 mt-2 truncate w-full" title={item.name}>{item.name}</div>
                              <div className="mt-3 pt-3 border-t border-slate-700 w-full text-[10px] space-y-1">
                                  <div className="flex justify-between text-slate-400 items-center"><span>2Y CAGR:</span><span className={item.cagr2 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr2 !== null ? `${item.cagr2.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span>3Y CAGR:</span><span className={item.cagr3 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr3 !== null ? `${item.cagr3.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span>5Y CAGR:</span><span className={item.cagr5 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr5 !== null ? `${item.cagr5.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span title={item.symbol === 'DOW' ? 'Since 2019' : '10 Year'}>{item.symbol === 'DOW' ? '6Y' : '10Y'} CAGR:</span><span className={item.cagr10 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr10 !== null ? `${item.cagr10.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center border-t border-slate-800 pt-1 mt-1"><span>Total:</span><span className={item.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>{item.totalReturn !== null ? `${item.totalReturn.toFixed(0)}%` : 'N/A'}</span></div>
                              </div>
                          </div>
                          ))}
                      </div>
                  </div>
                  </>
              )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 6. APP (Defined Last) ---

const App = () => {
  const [currentView, setView] = useState('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  return (
    <>
    <style>{`
      :root { max-width: none !important; }
      body { display: block !important; min-width: 0 !important; place-items: unset !important; }
      #root { max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; width: 100% !important; }
    `}</style>
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-amber-200 flex flex-col">
      <Navbar currentView={currentView} setView={setView} />
      
      <main className="flex-grow flex flex-col w-full relative">
        {currentView === 'home' && <HomeView setView={setView} />}
        {currentView === 'executives' && <ExecutivesView setView={setView} />}
        {currentView === 'data' && <DataModelsView />}
      </main>
      
      <Footer />
    </div>
    </>
  );
};

export default App;
