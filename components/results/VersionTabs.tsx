"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

interface VersionTabsProps {
  versions: number;
  activeVersion: number;
  onVersionChange: (version: number) => void;
  children: React.ReactNode;
}

export function VersionTabs({
  versions,
  activeVersion,
  onVersionChange,
  children,
}: VersionTabsProps) {
  const { t } = useI18n();

  if (versions <= 1) {
    return <div>{children}</div>;
  }

  return (
    <Tabs
      value={`v${activeVersion}`}
      onValueChange={(val) => onVersionChange(parseInt(val.replace("v", "")))}
      className="w-full"
    >
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <TabsList className="w-full min-w-max sm:min-w-0 flex justify-start sm:justify-center h-10 p-1 bg-muted/80 rounded-lg">
          {Array.from({ length: versions }, (_, i) => (
            <TabsTrigger
              key={i}
              value={`v${i + 1}`}
              className="flex-1 min-w-[90px] px-3 py-1.5 text-xs sm:text-sm font-medium transition-all"
            >
              {t.results.version(i + 1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {Array.from({ length: versions }, (_, i) => (
        <TabsContent key={i} value={`v${i + 1}`} className="mt-3 focus-visible:outline-none">
          {i + 1 === activeVersion && children}
        </TabsContent>
      ))}
    </Tabs>
  );
}
