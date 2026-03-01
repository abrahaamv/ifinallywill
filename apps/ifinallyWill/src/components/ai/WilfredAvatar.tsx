/**
 * WilfredAvatar — branded avatar for the AI assistant
 */

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-2xl',
} as const;

export function WilfredAvatar({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-brand-navy text-white ${sizes[size]} ${className}`}
    >
      <img
        src="/images/lawyer Wilfred.png"
        alt="Wilfred"
        className="w-full h-full rounded-full object-cover"
        onError={(e) => {
          // Fallback to emoji if image not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.textContent = '\u{1F3A9}';
        }}
      />
    </div>
  );
}
