'use client';

import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

type MotionButtonProps = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function MotionButton({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: MotionButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02, y: -1 }}
      whileDrag={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 460, damping: 25 }}
      className={`motion-btn motion-btn-${variant}${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
}
