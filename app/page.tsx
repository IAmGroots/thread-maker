"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PenTool } from "lucide-react";
import { TopicInput } from "@/components/generator/TopicInput";
import { CustomizationPanel } from "@/components/generator/CustomizationPanel";
import { ThreadPreview } from "@/components/results/ThreadPreview";
import { VersionTabs } from "@/components/results/VersionTabs";
import { Header } from "@/components/header";
import { InspirationPrompts } from "@/components/results/InspirationPrompts";
import { ThreadSkeletonLoader } from "@/components/results/ThreadSkeletonLoader";
import { TransformDialog } from "@/components/results/TransformDialog";
import { AdjustLengthDialog } from "@/components/results/AdjustLengthDialog";
import { DEFAULT_GENERATOR_CONFIG, GeneratorConfig } from "@/types/generator";
import { GeneratedThread, SavedThread, Tweet, WritingStyle, Tone } from "@/types/thread";
import { generateId, countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";
import { saveThread, downloadFile } from "@/lib/storage/localStorage";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [config, setConfig] = useState<GeneratorConfig>(
    DEFAULT_GENERATOR_CONFIG,
  );
  const [generatedThreads, setGeneratedThreads] = useState<GeneratedThread[]>(
    [],
  );
  const [activeVersion, setActiveVersion] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [topicError, setTopicError] = useState("");

  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [isTransformLoading, setIsTransformLoading] = useState(false);
  const [isAdjustLengthOpen, setIsAdjustLengthOpen] = useState(false);
  const [isAdjustLengthLoading, setIsAdjustLengthLoading] = useState(false);
  const [adjustLengthTargetIndex, setAdjustLengthTargetIndex] = useState(0);

  // Check if a saved thread was requested to be loaded from Saved Library
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("thread_maker_load_thread");
      if (raw) {
        sessionStorage.removeItem("thread_maker_load_thread");
        const loadedThread = JSON.parse(raw) as SavedThread;
        if (loadedThread && loadedThread.metadata) {
          const tweetCount =
            loadedThread.metadata.settings?.numberOfTweets ||
            loadedThread.totalTweets ||
            3;
          const format =
            loadedThread.metadata.format ||
            (tweetCount === 1 ? "single" : "thread");

          setConfig({
            topic: loadedThread.metadata.topic || "",
            format,
            style:
              loadedThread.metadata.style || DEFAULT_GENERATOR_CONFIG.style,
            tone: loadedThread.metadata.tone || DEFAULT_GENERATOR_CONFIG.tone,
            language:
              loadedThread.metadata.language ||
              DEFAULT_GENERATOR_CONFIG.language,
            targetAudience: loadedThread.metadata.targetAudience || "",
            contentGoal:
              loadedThread.metadata.contentGoal ||
              DEFAULT_GENERATOR_CONFIG.contentGoal,
            numberOfTweets: tweetCount,
            numberOfVersions:
              loadedThread.metadata.settings?.numberOfVersions || 1,
            useHook: loadedThread.metadata.settings?.useHook ?? true,
            useCTA: loadedThread.metadata.settings?.useCTA ?? true,
            includeEmojis: loadedThread.metadata.settings?.includeEmojis ?? true,
            includeHashtags:
              loadedThread.metadata.settings?.includeHashtags ?? true,
            customHashtags:
              loadedThread.metadata.settings?.customHashtags || [],
            tweetLength:
              loadedThread.metadata.settings?.tweetLength || "medium",
          });

          const genThread: GeneratedThread = {
            metadata: loadedThread.metadata,
            tweets: loadedThread.tweets,
            totalTweets: loadedThread.totalTweets,
            totalChars: loadedThread.totalChars,
            version: 1,
          };

          setGeneratedThreads([genThread]);
          setActiveVersion(1);

          toast({
            title: t.toasts.loadedToStudio,
            description: t.toasts.loadedToStudioDesc,
          });
        }
      }
    } catch (err) {
      console.error("Error loading thread from sessionStorage:", err);
    }
  }, [t, toast]);

  const handleGenerate = async () => {
    // Validation
    if (!config.topic.trim()) {
      setTopicError(t.composer.topicErrorRequired);
      return;
    }
    setTopicError("");

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate thread");
      }

      // Transform API response to GeneratedThread format
      const threads: GeneratedThread[] = data.threads.map(
        (threadData: any, index: number) => {
          const tweets: Tweet[] = threadData.tweets.map((t: any) => ({
            id: generateId(),
            content: t.content,
            order: t.order,
            charCount: t.charCount,
            hasEmoji: t.hasEmoji,
            hashtags: t.hashtags || [],
          }));

          const totalChars = tweets.reduce((sum, t) => sum + t.charCount, 0);

          return {
            metadata: {
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              topic: config.topic,
              format: config.numberOfTweets === 1 ? "single" : "thread",
              style: config.style,
              tone: config.tone,
              language: config.language,
              targetAudience: config.targetAudience,
              contentGoal: config.contentGoal,
              settings: {
                numberOfTweets: config.numberOfTweets,
                numberOfVersions: config.numberOfVersions,
                useHook: config.useHook,
                useCTA: config.useCTA,
                includeEmojis: config.includeEmojis,
                includeHashtags: config.includeHashtags,
                customHashtags: config.customHashtags,
                tweetLength: config.tweetLength,
              },
            },
            tweets,
            totalTweets: tweets.length,
            totalChars,
            version: index + 1,
          };
        },
      );

      setGeneratedThreads(threads);
      setActiveVersion(1);

      toast({
        title: t.toasts.success,
        description: t.toasts.generatedSuccess(threads.length),
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: t.toasts.generationFailed,
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const threadToSave = generatedThreads[activeVersion - 1];
    if (!threadToSave) return;

    const saved = saveThread({
      ...threadToSave,
      isFavorite: false,
      tags: [],
      notes: "",
    });

    if (saved) {
      toast({
        title: t.toasts.saved,
        description: t.toasts.savedDesc,
      });
    } else {
      toast({
        title: t.toasts.saveFailed,
        description: t.toasts.saveFailedDesc,
        variant: "destructive",
      });
    }
  };

  const handleEditTweet = (tweetIndex: number, newContent: string) => {
    setGeneratedThreads((prev) => {
      const updated = [...prev];
      const currentThread = { ...updated[activeVersion - 1] };
      const updatedTweets = [...currentThread.tweets];

      updatedTweets[tweetIndex] = {
        ...updatedTweets[tweetIndex],
        content: newContent,
        charCount: countTwitterChars(newContent),
      };

      currentThread.tweets = updatedTweets;
      currentThread.totalChars = updatedTweets.reduce(
        (sum, t) => sum + t.charCount,
        0,
      );
      currentThread.metadata.updatedAt = new Date().toISOString();

      updated[activeVersion - 1] = currentThread;
      return updated;
    });

    toast({
      title: t.toasts.tweetUpdated,
      description: t.toasts.tweetUpdatedDesc,
    });
  };

  const handleRegenerateTweet = async (tweetIndex: number) => {
    const currentThread = generatedThreads[activeVersion - 1];
    if (!currentThread) return;

    setIsLoading(true);
    try {
      const context = currentThread.tweets.map((t) => t.content);

      const response = await fetch("/api/regenerate-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweetIndex,
          context,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to regenerate tweet");
      }

      // Update the specific tweet
      setGeneratedThreads((prev) => {
        const updated = [...prev];
        const currentThread = { ...updated[activeVersion - 1] };
        const updatedTweets = [...currentThread.tweets];

        updatedTweets[tweetIndex] = {
          id: generateId(),
          content: data.tweet.content,
          order: data.tweet.order,
          charCount: data.tweet.charCount,
          hasEmoji: data.tweet.hasEmoji,
          hashtags: data.tweet.hashtags || [],
        };

        currentThread.tweets = updatedTweets;
        currentThread.totalChars = updatedTweets.reduce(
          (sum, t) => sum + t.charCount,
          0,
        );
        currentThread.metadata.updatedAt = new Date().toISOString();

        updated[activeVersion - 1] = currentThread;
        return updated;
      });

      toast({
        title: t.toasts.regenerated,
        description: t.toasts.regeneratedDesc(tweetIndex),
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: t.toasts.regenerationFailed,
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    await handleGenerate();
  };

  const handleTransform = async (newStyle: WritingStyle, newTone: Tone) => {
    const threadToTransform = generatedThreads[activeVersion - 1];
    if (!threadToTransform) return;

    setIsTransformLoading(true);
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: threadToTransform.tweets.map((t) => t.content),
          newStyle,
          newTone,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to transform thread");
      }

      const updatedTweets: Tweet[] = data.tweets.map((t: any) => ({
        id: generateId(),
        content: t.content,
        order: t.order,
        charCount: countTwitterChars(t.content),
        hasEmoji: hasEmojis(t.content),
        hashtags: extractHashtags(t.content),
      }));

      setGeneratedThreads((prev) => {
        const updated = [...prev];
        const active = { ...updated[activeVersion - 1] };
        active.tweets = updatedTweets;
        active.totalTweets = updatedTweets.length;
        active.totalChars = updatedTweets.reduce(
          (sum, tw) => sum + tw.charCount,
          0,
        );
        active.metadata = {
          ...active.metadata,
          style: newStyle,
          tone: newTone,
          updatedAt: new Date().toISOString(),
        };
        updated[activeVersion - 1] = active;
        return updated;
      });

      toast({
        title: t.toasts.success,
        description: t.toasts.transformSuccess,
      });
    } catch (error) {
      console.error("Transform error:", error);
      toast({
        title: t.toasts.transformFailed,
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsTransformLoading(false);
    }
  };

  const handleAdjustLengthApply = async (
    tweetIndex: number,
    direction: "shorten" | "lengthen",
  ) => {
    const threadToAdjust = generatedThreads[activeVersion - 1];
    if (!threadToAdjust || !threadToAdjust.tweets[tweetIndex]) return;

    const targetTweet = threadToAdjust.tweets[tweetIndex];
    setIsAdjustLengthLoading(true);
    try {
      const response = await fetch("/api/adjust-length", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweetContent: targetTweet.content,
          direction,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to adjust tweet length");
      }

      const adjustedTweet: Tweet = {
        id: generateId(),
        content: data.tweet.content,
        order: targetTweet.order,
        charCount: countTwitterChars(data.tweet.content),
        hasEmoji: hasEmojis(data.tweet.content),
        hashtags: extractHashtags(data.tweet.content),
      };

      setGeneratedThreads((prev) => {
        const updated = [...prev];
        const active = { ...updated[activeVersion - 1] };
        const updatedTweets = [...active.tweets];
        updatedTweets[tweetIndex] = adjustedTweet;
        active.tweets = updatedTweets;
        active.totalChars = updatedTweets.reduce(
          (sum, tw) => sum + tw.charCount,
          0,
        );
        active.metadata = {
          ...active.metadata,
          updatedAt: new Date().toISOString(),
        };
        updated[activeVersion - 1] = active;
        return updated;
      });

      toast({
        title: t.toasts.success,
        description: t.toasts.adjustLengthSuccess,
      });
    } catch (error) {
      console.error("Adjust length error:", error);
      toast({
        title: t.toasts.adjustLengthFailed,
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAdjustLengthLoading(false);
    }
  };

  const handleExport = () => {
    const threadToExport = generatedThreads[activeVersion - 1];
    if (!threadToExport) return;

    const content = threadToExport.tweets
      .map((t) => `${t.order}/${threadToExport.totalTweets}\n\n${t.content}`)
      .join("\n\n---\n\n");

    downloadFile(content, `thread-${Date.now()}.txt`, "text/plain");
    toast({
      title: t.toasts.exported,
      description: t.toasts.exportedTxtDesc,
    });
  };

  const currentThread = generatedThreads[activeVersion - 1];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
          {/* Masthead */}
          <div className="mb-6 sm:mb-8 pb-4 border-b">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t.composer.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t.composer.subtitle}
            </p>
          </div>

          {/* Editorial Workbench Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Composer */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
              <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
                <TopicInput
                  value={config.topic}
                  onChange={(value) => {
                    setConfig({ ...config, topic: value });
                    if (topicError) setTopicError("");
                  }}
                  error={topicError}
                />

                <CustomizationPanel
                  style={config.style}
                  onStyleChange={(style) => setConfig({ ...config, style })}
                  tone={config.tone}
                  onToneChange={(tone) => setConfig({ ...config, tone })}
                  language={config.language}
                  onLanguageChange={(language) =>
                    setConfig({ ...config, language })
                  }
                  contentGoal={config.contentGoal}
                  onContentGoalChange={(contentGoal) =>
                    setConfig({ ...config, contentGoal })
                  }
                  targetAudience={config.targetAudience}
                  onTargetAudienceChange={(targetAudience) =>
                    setConfig({ ...config, targetAudience })
                  }
                  tweetLength={config.tweetLength}
                  onTweetLengthChange={(tweetLength) =>
                    setConfig({ ...config, tweetLength })
                  }
                  numberOfTweets={config.numberOfTweets}
                  onNumberOfTweetsChange={(numberOfTweets) =>
                    setConfig({ ...config, numberOfTweets })
                  }
                  numberOfVersions={config.numberOfVersions}
                  onNumberOfVersionsChange={(numberOfVersions) =>
                    setConfig({ ...config, numberOfVersions })
                  }
                  useHook={config.useHook}
                  onUseHookChange={(useHook) => setConfig({ ...config, useHook })}
                  useCTA={config.useCTA}
                  onUseCTAChange={(useCTA) => setConfig({ ...config, useCTA })}
                  includeEmojis={config.includeEmojis}
                  onIncludeEmojisChange={(includeEmojis) =>
                    setConfig({ ...config, includeEmojis })
                  }
                  includeHashtags={config.includeHashtags}
                  onIncludeHashtagsChange={(includeHashtags) =>
                    setConfig({ ...config, includeHashtags })
                  }
                  customHashtags={config.customHashtags || []}
                  onCustomHashtagsChange={(customHashtags) =>
                    setConfig({ ...config, customHashtags })
                  }
                />

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full h-11 text-base font-medium transition-all"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      {t.composer.composingButton}
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" aria-hidden="true" />
                      {t.composer.composeButton}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Workbench */}
            <div className="lg:col-span-7 space-y-4 min-w-0">
              {isLoading ? (
                <ThreadSkeletonLoader numberOfTweets={config.numberOfTweets} />
              ) : generatedThreads.length > 0 ? (
                <div className="space-y-4">
                  <VersionTabs
                    versions={generatedThreads.length}
                    activeVersion={activeVersion}
                    onVersionChange={setActiveVersion}
                  >
                    <ThreadPreview
                      thread={currentThread}
                      onEditTweet={handleEditTweet}
                      onRegenerateTweet={handleRegenerateTweet}
                      onRegenerateAll={handleRegenerateAll}
                      onSave={handleSave}
                      onTransform={() => setIsTransformOpen(true)}
                      onAdjustLength={() => {
                        setAdjustLengthTargetIndex(0);
                        setIsAdjustLengthOpen(true);
                      }}
                      onAdjustLengthTweet={(index) => {
                        setAdjustLengthTargetIndex(index);
                        setIsAdjustLengthOpen(true);
                      }}
                      onExport={handleExport}
                      isLoading={
                        isLoading || isTransformLoading || isAdjustLengthLoading
                      }
                    />
                  </VersionTabs>
                </div>
              ) : (
                <InspirationPrompts
                  onSelectPrompt={(topic) => {
                    setConfig((prev) => ({ ...prev, topic }));
                    if (topicError) setTopicError("");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Transform Dialog */}
      {currentThread && (
        <TransformDialog
          open={isTransformOpen}
          onOpenChange={setIsTransformOpen}
          currentStyle={currentThread.metadata.style}
          currentTone={currentThread.metadata.tone}
          onTransform={handleTransform}
          isLoading={isTransformLoading}
        />
      )}

      {/* Adjust Length Dialog */}
      {currentThread && (
        <AdjustLengthDialog
          open={isAdjustLengthOpen}
          onOpenChange={setIsAdjustLengthOpen}
          tweets={currentThread.tweets}
          initialTweetIndex={adjustLengthTargetIndex}
          onApply={handleAdjustLengthApply}
          isLoading={isAdjustLengthLoading}
        />
      )}
    </>
  );
}
