"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  LANGUAGE_LABELS,
  CONTENT_GOAL_LABELS,
  TWEET_LENGTH_LABELS,
  Language,
  ContentGoal,
  TweetLength,
} from "@/types/thread";

interface AdvancedOptionsProps {
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

export function AdvancedOptions({
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
}: AdvancedOptionsProps) {
  const { t } = useI18n();
  const [hashtagInput, setHashtagInput] = useState("");

  const addHashtag = () => {
    const clean = hashtagInput.trim().replace(/^#+/, "");
    if (!clean) return;
    const formatted = `#${clean}`;
    if (!customHashtags.includes(formatted)) {
      onCustomHashtagsChange([...customHashtags, formatted]);
    }
    setHashtagInput("");
  };
  
  const removeHashtag = (tag: string) => {
    onCustomHashtagsChange(customHashtags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t.composer.parameters}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content Language */}
        <div className="space-y-2">
          <Label htmlFor="language">{t.composer.contentLanguage}</Label>
          <Select
            value={language}
            onValueChange={(val) => onLanguageChange(val as Language)}
          >
            <SelectTrigger id="language">
              <SelectValue>
                {t.options.languages[language] || LANGUAGE_LABELS[language]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {t.options.languages[key] || label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Goal */}
        <div className="space-y-2">
          <Label htmlFor="contentGoal">{t.composer.contentGoal}</Label>
          <Select
            value={contentGoal}
            onValueChange={(val) => onContentGoalChange(val as ContentGoal)}
          >
            <SelectTrigger id="contentGoal">
              <SelectValue>
                {t.options.goals[contentGoal] || CONTENT_GOAL_LABELS[contentGoal]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTENT_GOAL_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {t.options.goals[key] || label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience">{t.composer.targetAudience}</Label>
          <Input
            id="targetAudience"
            className="text-sm"
            placeholder={t.composer.targetAudiencePlaceholder}
            value={targetAudience}
            onChange={(e) => onTargetAudienceChange(e.target.value)}
          />
        </div>

        {/* Tweet Length */}
        <div className="space-y-2">
          <Label htmlFor="tweetLength">{t.composer.tweetLength}</Label>
          <Select
            value={tweetLength}
            onValueChange={(val) => onTweetLengthChange(val as TweetLength)}
          >
            <SelectTrigger id="tweetLength">
              <SelectValue>
                {t.options.lengths[tweetLength] || TWEET_LENGTH_LABELS[tweetLength]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TWEET_LENGTH_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {t.options.lengths[key] || label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Number of Tweets Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="numberOfTweets">{t.composer.numberOfTweets}</Label>
          <span className="text-sm font-medium">{numberOfTweets}</span>
        </div>
        <Slider
          id="numberOfTweets"
          min={1}
          max={25}
          step={1}
          value={[numberOfTweets]}
          onValueChange={(val) => onNumberOfTweetsChange(val[0])}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          {numberOfTweets === 1
            ? t.composer.singleTweetDesc
            : t.composer.threadWithTweetsDesc(numberOfTweets)}
        </p>
      </div>

      {/* Number of Versions */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>{t.composer.generateVersions}</Label>
        </div>

        <ToggleGroup
          type="single"
          value={String(numberOfVersions)}
          onValueChange={(value) => {
            if (value) {
              onNumberOfVersionsChange(Number(value));
            }
          }}
          className="w-full grid grid-cols-5 gap-2"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const value = i + 1;

            return (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                aria-label={t.composer.versionAria(value)}
                className="h-11"
              >
                {value}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        <p className="text-xs text-muted-foreground">
          {t.composer.versionsDesc(numberOfVersions)}
        </p>
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">{t.composer.contentOptions}</h4>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="useHook" className="cursor-pointer">
              {t.composer.useHook}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t.composer.useHookDesc}
            </p>
          </div>
          <Switch
            id="useHook"
            checked={useHook}
            onCheckedChange={onUseHookChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="useCTA" className="cursor-pointer">
              {t.composer.useCTA}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t.composer.useCTADesc}
            </p>
          </div>
          <Switch
            id="useCTA"
            checked={useCTA}
            onCheckedChange={onUseCTAChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="includeEmojis" className="cursor-pointer">
              {t.composer.includeEmojis}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t.composer.includeEmojisDesc}
            </p>
          </div>
          <Switch
            id="includeEmojis"
            checked={includeEmojis}
            onCheckedChange={onIncludeEmojisChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="includeHashtags" className="cursor-pointer">
              {t.composer.includeHashtags}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t.composer.includeHashtagsDesc}
            </p>
          </div>
          <Switch
            id="includeHashtags"
            checked={includeHashtags}
            onCheckedChange={onIncludeHashtagsChange}
          />
        </div>
      </div>

      {/* Custom Hashtags */}
      {includeHashtags && (
        <div className="space-y-2">
          <Label htmlFor="customHashtags">{t.composer.customHashtags}</Label>
          <div className="flex gap-2">
            <Input
              id="customHashtags"
              placeholder={t.composer.customHashtagsPlaceholder}
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHashtag();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addHashtag} disabled={!hashtagInput.trim()}>
              {t.common.add}
            </Button>
          </div>
          {customHashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {customHashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  #{tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    aria-label={`Remove #${tag}`}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
