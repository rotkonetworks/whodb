// UI component type fixes for React 19
import type { ReactNode } from 'react';

declare module '@radix-ui/react-accordion' {
  interface AccordionItemProps {
    children?: ReactNode;
  }
  
  interface AccordionTriggerProps {
    children?: ReactNode;
  }
  
  interface AccordionContentProps {
    children?: ReactNode;
  }
}

declare module '@radix-ui/react-separator' {
  interface SeparatorProps {
    className?: string;
  }
}

export {};
