// This file helps TypeScript understand CSS modules and Tailwind directives
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Declare Tailwind CSS classes
declare module 'tailwindcss/tailwind.css';

// Add support for @apply and other Tailwind directives
declare namespace React {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
