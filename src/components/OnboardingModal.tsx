import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  KeyRound,
  PieChart,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OnboardingModal: React.FC = () => {
  const { t, isOnboardingOpen, completeOnboarding } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOnboardingOpen) return null;

  const STEPS = [
    {
      title: t('onboarding_step1_title'),
      desc: t('onboarding_step1_desc'),
      icon: Wallet,
      color: 'emerald',
      badges: ['Otomatis Real-Time', 'Tanpa Iklan', '100% Privat'],
    },
    {
      title: t('onboarding_step2_title'),
      desc: t('onboarding_step2_desc'),
      icon: Activity,
      color: 'blue',
      badges: ['BCA, Mandiri, BRI, BNI', 'GoPay, OVO, DANA', 'AI Auto-Kategorisasi'],
    },
    {
      title: t('onboarding_step3_title'),
      desc: t('onboarding_step3_desc'),
      icon: PieChart,
      color: 'amber',
      badges: ['Grafik Tren Keuangan', 'Pengingat Jatuh Tempo', 'Ekspor PDF & CSV Resmi'],
    },
    {
      title: t('onboarding_step4_title'),
      desc: t('onboarding_step4_desc'),
      icon: ShieldCheck,
      color: 'indigo',
      badges: ['AES-GCM 256-Bit', '2FA Google Authenticator', 'Sinkronisasi Cloud Terenkripsi'],
    },
  ];

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close/Skip button */}
        <button
          onClick={completeOnboarding}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step Visual Art */}
        <div className="mt-2 flex flex-col items-center text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-${step.color}-500/10 text-${step.color}-600 border border-${step.color}-500/20 shadow-inner`}
          >
            <StepIcon className="h-10 w-10" />
          </div>

          <div className="mt-5 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-7 bg-emerald-600'
                    : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {step.title}
          </h3>

          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {step.desc}
          </p>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {step.badges.map(b => (
              <span
                key={b}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={completeOnboarding}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {t('skip_tour')}
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500"
          >
            <span>{currentStep === STEPS.length - 1 ? t('get_started') : t('next_step')}</span>
            {currentStep === STEPS.length - 1 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
