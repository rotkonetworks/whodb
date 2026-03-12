import { Circle } from "lucide-react";
import React from "react";

import { HelpCarousel } from "@/help/helpCarousel";
import { useDarkMode } from "@/hooks/useDarkMode";

export const LoadingPlaceholder = ({ className, children, ...props }: {
  className?: string,
  children?: React.ReactNode | React.ReactNode[],
} & React.HTMLAttributes<HTMLDivElement>) => <div {...props}
  className={`${className} animate-pulse bg-gray`} 
>
  {children}
</div>

export const LoadingTabs = ({ className, ...props }: {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>) => <>
  <LoadingPlaceholder {...props}
    className={
      "h-10 rounded-md p-1 text-muted-foreground grid w-full grid-cols-3 overflow-hidden"
      + className || ""
    }
  />
</>

export const LoadingContent = ({ className, children, ...props }: {
  className?: string,
  children?: React.ReactNode | React.ReactNode[],
} & React.HTMLAttributes<HTMLDivElement>) => <>
  <div {...props}
    className={
      "flex flex-grow flex-col items-stretch mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 "
      + className || ""
    }
  >
    <LoadingPlaceholder className="flex flex-grow w-full flex-center font-bold">
      {children}
    </LoadingPlaceholder>

    <div className="flex justify-between mt-6">
      <div className="flex w-full sm:w-auto">
        <LoadingPlaceholder className="min-w-[140px] h-10" />
      </div>
      <div className="flex w-full sm:w-auto">
        <LoadingPlaceholder className="min-w-[140px] h-10" />
      </div>
    </div>
  </div>
</>

export function Loading() {
  const { isDark } = useDarkMode();

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 flex items-stretch ${isDark
      ? 'bg-[#2C2B2B] text-[#FFFFFF]'
      : 'bg-[#FFFFFF] text-[#1E1E1E]'
    }`}>
      <div className="container mx-auto max-w-3xl flex flex-col items-stretch">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 min-w-[140px] h-2.5em">
              <LoadingPlaceholder className="min-w-[140px] h-100%" />
            </div>
            <div className="flex-1 min-w-[140px] h-2.5em">
              <LoadingPlaceholder className="min-w-[140px] h-100%" />
            </div>
          </div>
          <div className="flex gap-2">
            <LoadingPlaceholder
              className="h-10 w-10 flex flex-center border-[#E6007A] text-inherit hover:text-[#FFFFFF]" 
            >
              <Circle className="h-4 w-4" />
            </LoadingPlaceholder>
          </div>
        </div>
        
        <div className="w-full flex flex-grow flex-col flex-stretch">
          <LoadingTabs />
          <LoadingContent>
            <div className="flex flex-col items-stretch border-primary">
              <HelpCarousel className="rounded-lg bg-background/30" autoPlayInterval={4000} />
              <span className="sm:text-3xl text-xl text-center font-bold pt-4">
                Syncing light client...
              </span>
            </div>
          </LoadingContent>
        </div>
      </div>
    </div>
  );
}
