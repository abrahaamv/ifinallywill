/**
 * Celebration modal — shown when a category is completed
 *
 * Displays confetti animation, congratulations message, and auto-navigates
 * back to the dashboard after a delay.
 */

import { useEffect, useRef } from 'react';
import type { WizardCategory } from '../../lib/wizard';

interface Props {
  open: boolean;
  category: WizardCategory | null;
  onClose: () => void;
}

const CATEGORY_MESSAGES: Record<WizardCategory, { title: string; message: string }> = {
  aboutYou: {
    title: 'About You Complete!',
    message:
      "Great job! You've finished telling us about yourself. Your personal details are saved.",
  },
  people: {
    title: 'People Section Complete!',
    message: 'Wonderful! Your key people are all set. Your loved ones are accounted for.',
  },
  assets: {
    title: 'Assets Complete!',
    message: 'Excellent! Your assets are all recorded and documented.',
  },
  gifts: {
    title: 'Gifts Complete!',
    message: 'Well done! Your specific gifts and bequests are assigned.',
  },
  residue: {
    title: 'Residue Complete!',
    message: 'Great! Your residue distribution is set up.',
  },
  children: {
    title: 'Children Section Complete!',
    message: 'Wonderful! Trusting and guardianship arrangements are in place for your children.',
  },
  wipeout: {
    title: 'Wipeout Complete!',
    message: 'Your backup beneficiary plan is set up.',
  },
  finalArrangements: {
    title: 'All Arrangements Done!',
    message:
      "Congratulations! You've completed all your arrangements. Your estate plan is ready for review!",
  },
};

function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
  }> = [];

  const colors = ['#FFBF00', '#7C3AED', '#10B981', '#EF4444', '#3B82F6', '#F59E0B'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.8) * 10,
      color: colors[Math.floor(Math.random() * colors.length)] ?? '#FFBF00',
      size: Math.random() * 6 + 3,
      life: 1,
    });
  }

  let animId: number;
  function animate() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.012;
      ctx!.globalAlpha = Math.max(0, p.life);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx!.globalAlpha = 1;
    if (alive) {
      animId = requestAnimationFrame(animate);
    }
  }
  animate();

  return () => cancelAnimationFrame(animId);
}

export function CelebrationModal({ open, category, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const cleanup = fireConfetti(canvas);
    const timer = setTimeout(onClose, 4000);

    return () => {
      cleanup?.();
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open || !category) return null;

  const msg = CATEGORY_MESSAGES[category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center z-10">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-[var(--ifw-neutral-900)] mb-2">{msg.title}</h2>
        <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">{msg.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
