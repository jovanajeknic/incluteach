/** Variants for a list whose items rise in one after another. */
export const listMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const itemMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.3, 1] as const } },
};
