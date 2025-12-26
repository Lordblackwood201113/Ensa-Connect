import { useEffect, useState } from 'react';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  trackColor?: string;
  progressColor?: string;
  textColor?: string;
  animationDuration?: number;
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  className = '',
  showValue = true,
  trackColor = 'rgba(255, 255, 255, 0.2)',
  progressColor = '#FFFFFF',
  textColor = '#FFFFFF',
  animationDuration = 1000,
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;
  
  useEffect(() => {
    // Animate from 0 to value
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(value * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, animationDuration]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle (track) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.1s ease-out',
          }}
        />
      </svg>
      {showValue && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: textColor }}
        >
          <span className="text-xs font-bold">{animatedValue}%</span>
        </div>
      )}
    </div>
  );
}
