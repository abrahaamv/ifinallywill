/**
 * WilfredAvatar — animated AI assistant avatar
 *
 * Features ported from source:
 * - Gentle floating when idle (stops when user is typing)
 * - Soft pulsing radial glow behind avatar
 * - Orbiting particles when thinking
 */

import { motion } from 'framer-motion';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  isTyping?: boolean;
  isThinking?: boolean;
  showGlow?: boolean;
  className?: string;
}

const EASING = [0.22, 1, 0.36, 1] as const;

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
} as const;

const orbitRadius = {
  sm: 10,
  md: 16,
  lg: 32,
} as const;

export function WilfredAvatar({
  size = 'md',
  isTyping = false,
  isThinking = false,
  showGlow = false,
  className = '',
}: Props) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Pulsing radial glow */}
      {showGlow && (
        <motion.div
          className="absolute inset-0 rounded-full -m-4"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 191, 0, 0.25) 0%, rgba(255, 191, 0, 0.08) 40%, transparent 70%)',
          }}
          animate={{
            scale: isThinking ? [1.2, 1.4, 1.2] : [1, 1.15, 1],
            opacity: isThinking ? [0.6, 1, 0.6] : [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: isThinking ? 1.2 : 2.5,
            repeat: Infinity,
            ease: EASING as unknown as string,
          }}
        />
      )}

      {/* Idle floating — stops when typing */}
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={
          isTyping
            ? {}
            : {
                y: [0, -4, 0],
                rotate: [0, 0.5, -0.5, 0],
              }
        }
        transition={{
          y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        {/* Orbiting particles when thinking */}
        {isThinking && (
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center -z-[1]"
            style={{ width: '140%', height: '140%', left: '-20%', top: '-20%' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            {[0, 120, 240].map((deg) => (
              <div
                key={deg}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#FFBF00]/90 shadow-sm"
                style={{
                  transform: `rotate(${deg}deg) translateY(-${orbitRadius[size]}px)`,
                  willChange: 'transform',
                }}
              />
            ))}
          </motion.div>
        )}

        <img
          src="/images/lawyer Wilfred.png"
          alt="Wilfred"
          className={`relative z-10 w-full h-full rounded-full object-cover ${
            isThinking ? 'drop-shadow-[0_0_12px_rgba(255,191,0,0.5)]' : ''
          }`}
          style={{ transition: 'filter 0.3s ease' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.textContent = '\u{1F3A9}';
          }}
        />
      </motion.div>
    </motion.div>
  );
}
