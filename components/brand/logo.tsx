import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-2xl' },
  lg: { icon: 48, text: 'text-4xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/icon-192.png"
        alt="bruh. logo"
        width={sizes[size].icon}
        height={sizes[size].icon}
        className="rounded-lg"
      />

      {showText && (
        <span
          className={cn(
            'font-display font-bold tracking-tight text-foreground',
            sizes[size].text
          )}
        >
          bruh<span className="text-primary">.</span>
        </span>
      )}
    </div>
  );
}
