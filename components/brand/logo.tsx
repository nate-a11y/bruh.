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
      {/* Icon: stylized "B" mark */}
      <div
        className="flex items-center justify-center rounded-lg bg-primary"
        style={{
          width: sizes[size].icon,
          height: sizes[size].icon,
        }}
      >
        <span
          className="font-display font-bold text-primary-foreground"
          style={{ fontSize: sizes[size].icon * 0.5 }}
        >
          B
        </span>
      </div>

      {showText && (
        <span
          className={cn(
            'font-display font-bold tracking-tight text-foreground',
            sizes[size].text
          )}
        >
          bruh
        </span>
      )}
    </div>
  );
}
