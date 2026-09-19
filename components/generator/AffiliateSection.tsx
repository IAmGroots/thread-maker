"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AffiliateConfig,
  AffiliateProduct,
  AffiliateStoryAngle,
  AffiliateCtaPlacement,
} from "@/types/thread";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Tag,
  Plus,
  X,
} from "lucide-react";

interface AffiliateSectionProps {
  affiliate?: AffiliateConfig;
  onChange: (value: AffiliateConfig) => void;
  onAutoFillTopic?: (suggestedTopic: string) => void;
}

export function AffiliateSection({
  affiliate,
  onChange,
  onAutoFillTopic,
}: AffiliateSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const isEnabled = affiliate?.enabled ?? false;
  const product: Partial<AffiliateProduct> = affiliate?.product ?? {
    productName: "",
    productUrl: "",
    affiliateUrl: "",
    price: "",
    keyPoints: [],
    storyAngle: "problem-solution",
    disclosureTag: "",
    ctaPlacement: "last_tweet",
  };

  const [productUrlInput, setProductUrlInput] = useState(
    product.productUrl || "",
  );
  const [isFetching, setIsFetching] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [tagInput, setTagInput] = useState("");

  const currentTags = product.disclosureTag
    ? product.disclosureTag.split(/\s+/).filter(Boolean)
    : [];

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        product: affiliate?.product,
      });
      return;
    }

    onChange({
      enabled: true,
      product: {
        productName: product.productName || "",
        productUrl: product.productUrl || productUrlInput || "",
        affiliateUrl: product.affiliateUrl || "",
        price: product.price || "",
        keyPoints: product.keyPoints || [],
        storyAngle:
          (product.storyAngle as AffiliateStoryAngle) || "problem-solution",
        disclosureTag: product.disclosureTag || "",
        ctaPlacement:
          (product.ctaPlacement as AffiliateCtaPlacement) || "last_tweet",
      },
    });
  };

  const updateProduct = (patch: Partial<AffiliateProduct>) => {
    const updated: AffiliateProduct = {
      productName: product.productName || "",
      productUrl: product.productUrl || "",
      affiliateUrl: product.affiliateUrl || "",
      price: product.price || "",
      keyPoints: product.keyPoints || [],
      storyAngle:
        (product.storyAngle as AffiliateStoryAngle) || "problem-solution",
      disclosureTag: product.disclosureTag || "",
      ctaPlacement:
        (product.ctaPlacement as AffiliateCtaPlacement) || "last_tweet",
      ...patch,
    };

    onChange({
      enabled: true,
      product: updated,
    });
  };

  const handleFetchMetadata = async () => {
    if (!productUrlInput.trim()) return;

    setIsFetching(true);
    try {
      const res = await fetch("/api/affiliate/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrlInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || t.affiliate.fetchError);
      }

      const scraped = data.data;

      if (scraped.fallbackToManual) {
        updateProduct({
          productUrl: scraped.resolvedUrl || productUrlInput,
          affiliateUrl:
            product.affiliateUrl || scraped.resolvedUrl || productUrlInput,
        });
        toast({
          title: t.affiliate.fetchFallbackNotice,
        });
      } else {
        const title = scraped.title || "";
        const price = scraped.price || "";
        const image = scraped.image || "";

        if (image) setPreviewImage(image);

        updateProduct({
          productName: title || product.productName || "",
          productUrl: scraped.resolvedUrl || productUrlInput,
          affiliateUrl:
            product.affiliateUrl || scraped.resolvedUrl || productUrlInput,
          price: price || product.price || "",
        });

        if (onAutoFillTopic && title && !product.productName) {
          onAutoFillTopic(`Review & pengalaman pakai ${title}`);
        }

        toast({
          title: t.affiliate.fetchSuccess,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.affiliate.fetchError;
      toast({
        title: t.affiliate.fetchError,
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleClearPreview = () => {
    setProductUrlInput("");
    setPreviewImage("");
    updateProduct({
      productUrl: "",
    });
  };

  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, "");
    if (!clean) return;
    const formatted = `#${clean}`;
    if (!currentTags.includes(formatted) && currentTags.length < 5) {
      const newTags = [...currentTags, formatted];
      updateProduct({ disclosureTag: newTags.join(" ") });
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    updateProduct({ disclosureTag: newTags.join(" ") });
  };

  const togglePreset = (preset: string) => {
    if (currentTags.includes(preset)) {
      removeTag(preset);
    } else {
      addTag(preset);
    }
  };

  const presets = ["#Ad", "#Affiliate", "#RacunShopee", "#SpillProduk"];

  return (
    <div className="rounded-xl border bg-card p-5 text-card-foreground space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
            <Label
              htmlFor="affiliate-mode-switch"
              className="text-sm font-semibold cursor-pointer"
            >
              {t.affiliate.toggleTitle}
            </Label>
            <Badge
              variant="outline"
              className="text-[10px] font-normal uppercase py-0 px-1.5"
            >
              Smart
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.affiliate.toggleSubtitle}
          </p>
        </div>

        <Switch
          id="affiliate-mode-switch"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          aria-label={t.affiliate.toggleTitle}
        />
      </div>

      {isEnabled && (
        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="affiliate-url-input"
              className="text-sm font-medium"
            >
              {t.affiliate.affiliateUrlLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <LinkIcon
                className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="affiliate-url-input"
                type="url"
                placeholder={t.affiliate.affiliateUrlPlaceholder}
                value={product.affiliateUrl || ""}
                onChange={(e) =>
                  updateProduct({ affiliateUrl: e.target.value })
                }
                className="pl-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-url-input" className="text-sm font-medium">
              {t.affiliate.productUrlLabel}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon
                  className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="product-url-input"
                  type="url"
                  placeholder={t.affiliate.productUrlPlaceholder}
                  value={productUrlInput}
                  onChange={(e) => {
                    setProductUrlInput(e.target.value);
                    updateProduct({ productUrl: e.target.value });
                  }}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleFetchMetadata}
                disabled={isFetching || !productUrlInput.trim()}
                className="shrink-0 text-sm font-medium"
              >
                {isFetching ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 mr-1.5 animate-spin"
                      aria-hidden="true"
                    />
                    {t.affiliate.fetchingButton}
                  </>
                ) : (
                  <>
                    <Sparkles
                      className="h-3.5 w-3.5 mr-1.5 text-primary"
                      aria-hidden="true"
                    />
                    {t.affiliate.fetchButton}
                  </>
                )}
              </Button>
            </div>

            {(previewImage || product.productName) && (
              <div className="flex items-center justify-between p-2.5 mt-2 rounded-lg border bg-muted/30 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="w-9 h-9 object-cover rounded-md border shrink-0 bg-background"
                      onError={() => setPreviewImage("")}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md border flex items-center justify-center bg-background shrink-0">
                      <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate text-foreground">
                      {product.productName || "Produk Terdeteksi"}
                    </p>
                    {product.price && (
                      <p className="text-muted-foreground font-mono text-xs">
                        {product.price}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearPreview}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  title={t.affiliate.removeProduct}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-name-input" className="text-sm font-medium">
              {t.affiliate.productNameLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-name-input"
              placeholder={t.affiliate.productNamePlaceholder}
              value={product.productName || ""}
              onChange={(e) => updateProduct({ productName: e.target.value })}
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="product-price-input"
              className="text-sm font-medium"
            >
              {t.affiliate.priceLabel}
            </Label>
            <Input
              id="product-price-input"
              placeholder={t.affiliate.pricePlaceholder}
              value={product.price || ""}
              onChange={(e) => updateProduct({ price: e.target.value })}
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.affiliate.storyAngleLabel}
            </Label>
            <Select
              value={product.storyAngle || "problem-solution"}
              onValueChange={(val) =>
                updateProduct({ storyAngle: val as AffiliateStoryAngle })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problem-solution">
                  {t.affiliate.angles["problem-solution"]}
                </SelectItem>
                <SelectItem value="honest-review">
                  {t.affiliate.angles["honest-review"]}
                </SelectItem>
                <SelectItem value="accidental-discovery">
                  {t.affiliate.angles["accidental-discovery"]}
                </SelectItem>
                <SelectItem value="before-after">
                  {t.affiliate.angles["before-after"]}
                </SelectItem>
                <SelectItem value="step-by-step">
                  {t.affiliate.angles["step-by-step"]}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t.affiliate.storyAngleDesc}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="key-points-textarea"
                className="text-sm font-medium"
              >
                {t.affiliate.keyPointsLabel}
              </Label>
              <span className="text-xs text-muted-foreground">
                Max 5 poin
              </span>
            </div>
            <Textarea
              id="key-points-textarea"
              rows={3}
              placeholder={t.affiliate.keyPointsPlaceholder}
              value={(product.keyPoints || []).join("\n")}
              onChange={(e) => {
                const lines = e.target.value
                  .split("\n")
                  .filter((line) => line.trim().length > 0)
                  .slice(0, 5);
                updateProduct({ keyPoints: lines });
              }}
              className="text-xs sm:text-sm resize-none min-h-[130px]"
            />
            <p className="text-xs text-muted-foreground">
              {t.affiliate.keyPointsDesc}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.affiliate.ctaPlacementLabel}
            </Label>
            <Select
              value={product.ctaPlacement || "last_tweet"}
              onValueChange={(val) =>
                updateProduct({ ctaPlacement: val as AffiliateCtaPlacement })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_tweet">
                  {t.affiliate.ctaPlacements.last_tweet}
                </SelectItem>
                <SelectItem value="reply">
                  {t.affiliate.ctaPlacements.reply}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t.affiliate.ctaPlacementDesc}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="disclosure-tag-input"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <Tag className="h-3 w-3 text-muted-foreground" />
              {t.affiliate.disclosureTagLabel}{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (Opsional)
              </span>
            </Label>

            <div className="flex gap-2">
              <Input
                id="disclosure-tag-input"
                placeholder={t.affiliate.disclosureTagCustomPlaceholder}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim() || currentTags.length >= 5}
              >
                {t.common.add}
              </Button>
            </div>

            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs py-0.5 pl-2 pr-1 gap-1 font-mono font-normal"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                      aria-label={`Hapus ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs text-muted-foreground mr-1">
                Rekomendasi:
              </span>
              {presets.map((preset) => {
                const isSelected = currentTags.includes(preset);
                return (
                  <Badge
                    key={preset}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-xs py-0 px-2 font-normal hover:bg-primary/20"
                    onClick={() => togglePreset(preset)}
                  >
                    {preset}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
