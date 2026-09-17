"use client";

import { StyleSelector } from "./StyleSelector";
import { ToneSelector } from "./ToneSelector";
import { AdvancedOptions } from "./AdvancedOptions";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  WritingStyle,
  Tone,
  Language,
  ContentGoal,
  TweetLength,
} from "@/types/thread";

interface CustomizationPanelProps {
  style: WritingStyle;
  onStyleChange: (value: WritingStyle) => void;
  tone: Tone;
  onToneChange: (value: Tone) => void;
  language: Language;
  onLanguageChange: (value: Language) => void;
  contentGoal: ContentGoal;
  onContentGoalChange: (value: ContentGoal) => void;
  targetAudience: string;
  onTargetAudienceChange: (value: string) => void;
  tweetLength: TweetLength;
  onTweetLengthChange: (value: TweetLength) => void;
  numberOfTweets: number;
  onNumberOfTweetsChange: (value: number) => void;
  numberOfVersions: number;
  onNumberOfVersionsChange: (value: number) => void;
  useHook: boolean;
  onUseHookChange: (value: boolean) => void;
  useCTA: boolean;
  onUseCTAChange: (value: boolean) => void;
  includeEmojis: boolean;
  onIncludeEmojisChange: (value: boolean) => void;
  includeHashtags: boolean;
  onIncludeHashtagsChange: (value: boolean) => void;
  customHashtags: string[];
  onCustomHashtagsChange: (value: string[]) => void;
}

export function CustomizationPanel({
  style,
  onStyleChange,
  tone,
  onToneChange,
  language,
  onLanguageChange,
  contentGoal,
  onContentGoalChange,
  targetAudience,
  onTargetAudienceChange,
  tweetLength,
  onTweetLengthChange,
  numberOfTweets,
  onNumberOfTweetsChange,
  numberOfVersions,
  onNumberOfVersionsChange,
  useHook,
  onUseHookChange,
  useCTA,
  onUseCTAChange,
  includeEmojis,
  onIncludeEmojisChange,
  includeHashtags,
  onIncludeHashtagsChange,
  customHashtags,
  onCustomHashtagsChange,
}: CustomizationPanelProps) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 text-card-foreground">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t.composer.toneAndStyle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StyleSelector value={style} onChange={onStyleChange} />
          <ToneSelector value={tone} onChange={onToneChange} />
        </div>
      </div>

      <div className="pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          id="advanced-options-trigger"
          aria-expanded={showAdvanced}
          aria-controls="advanced-options-panel"
          className="w-full justify-between px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 min-h-[44px]"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t.composer.advancedOptions}
          </span>
          <span className="flex items-center gap-1 text-xs font-normal">
            {showAdvanced ? t.common.hide : t.common.show}
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </Button>

        {showAdvanced && (
          <div
            id="advanced-options-panel"
            role="region"
            aria-labelledby="advanced-options-trigger"
            className="pt-4 mt-2 border-t"
          >
            <AdvancedOptions
              language={language}
              onLanguageChange={onLanguageChange}
              contentGoal={contentGoal}
              onContentGoalChange={onContentGoalChange}
              targetAudience={targetAudience}
              onTargetAudienceChange={onTargetAudienceChange}
              tweetLength={tweetLength}
              onTweetLengthChange={onTweetLengthChange}
              numberOfTweets={numberOfTweets}
              onNumberOfTweetsChange={onNumberOfTweetsChange}
              numberOfVersions={numberOfVersions}
              onNumberOfVersionsChange={onNumberOfVersionsChange}
              useHook={useHook}
              onUseHookChange={onUseHookChange}
              useCTA={useCTA}
              onUseCTAChange={onUseCTAChange}
              includeEmojis={includeEmojis}
              onIncludeEmojisChange={onIncludeEmojisChange}
              includeHashtags={includeHashtags}
              onIncludeHashtagsChange={onIncludeHashtagsChange}
              customHashtags={customHashtags}
              onCustomHashtagsChange={onCustomHashtagsChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
