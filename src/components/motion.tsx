import React from 'react';
import { motion, Variants } from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export const Motion: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({ className, children, delay = 0 }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.2 }}
    variants={{
      hidden: fadeUp.hidden,
      show: { ...(fadeUp.show as any), transition: { ...(fadeUp.show as any).transition, delay } },
    }}
  >
    {children}
  </motion.div>
);

export const MotionCard: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({ className = '', children, delay }) => (
  <Motion className={[ 'card', className ].filter(Boolean).join(' ')} delay={delay}>
    {children}
  </Motion>
);

export const Stagger: React.FC<React.PropsWithChildren<{ className?: string; stagger?: number }>> = ({ className, stagger = 0.06, children }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.15 }}
    variants={{}}
  >
    {React.Children.map(children, (child, i) => (
      <motion.div
        variants={fadeUp}
        custom={i}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: i * stagger, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {child}
      </motion.div>
    ))}
  </motion.div>
);
