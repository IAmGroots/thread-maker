"use client";

import { useState } from "react";
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
import { ShoppingBag, Link as LinkIcon, Tag, Plus, X } from "lucide-react";

interface AffiliateSectionProps {
  affiliate?: AffiliateConfig;
  onChange: (value: AffiliateConfig) => void;
  affiliateUrlError?: string;
  productNameError?: string;
  onAffiliateUrlChange?: () => void;
  onProductNameChange?: () => void;
}

export function AffiliateSection({
  affiliate,
  onChange,
  affiliateUrlError,
  productNameError,
  onAffiliateUrlChange,
  onProductNameChange,
}: AffiliateSectionProps) {
  const { t } = useI18n();

  const isEnabled = affiliate?.enabled ?? false;
  const product: Partial<AffiliateProduct> = affiliate?.product ?? {
    productName: "",
    affiliateUrl: "",
    price: "",
    keyPoints: [],
    storyAngle: "problem-solution",
    disclosureTag: "",
    ctaPlacement: "last_tweet",
  };

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
    <div className="rounded-xl border bg-background p-5 text-card-foreground space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
            <Label
              htmlFor="affiliate-mode-switch"
              className="text-sm font-semibold cursor-pointer"
            >
              {t.affiliate.toggleTitle}
            </Label>
            <Badge
              variant={isEnabled ? "secondary" : "outline"}
              className="text-[10px] font-normal py-0 px-1.5"
            >
              {isEnabled ? t.affiliate.statusOn : t.affiliate.statusOff}
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
                onChange={(e) => {
                  updateProduct({ affiliateUrl: e.target.value });
                  onAffiliateUrlChange?.();
                }}
                className={`pl-9 text-xs sm:text-sm ${
                  affiliateUrlError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                aria-invalid={affiliateUrlError ? "true" : "false"}
                aria-describedby={
                  affiliateUrlError ? "affiliate-url-error" : undefined
                }
              />
            </div>
            {affiliateUrlError && (
              <p
                id="affiliate-url-error"
                role="alert"
                className="text-sm text-destructive font-medium"
              >
                {affiliateUrlError}
              </p>
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
              onChange={(e) => {
                updateProduct({ productName: e.target.value });
                onProductNameChange?.();
              }}
              className={`text-xs sm:text-sm ${
                productNameError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
              aria-invalid={productNameError ? "true" : "false"}
              aria-describedby={
                productNameError ? "product-name-error" : undefined
              }
            />
            {productNameError && (
              <p
                id="product-name-error"
                role="alert"
                className="text-sm text-destructive font-medium"
              >
                {productNameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="product-price-input"
              className="text-sm font-medium flex items-center gap-1"
            >
              {t.affiliate.priceLabel}
              <span className="text-muted-foreground font-normal text-xs">
                {t.affiliate.optional}
              </span>
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
            </div>
            <Textarea
              id="key-points-textarea"
              rows={3}
              placeholder={t.affiliate.keyPointsPlaceholder}

              className="text-xs sm:text-sm resize-none min-h-[120px]"
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
              className="text-sm font-medium flex items-center gap-1"
            >
              {t.affiliate.disclosureTagLabel}{" "}
              <span className="text-muted-foreground font-normal text-xs">
                {t.affiliate.optional}
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
                      className="relative rounded-full p-0.5 hover:bg-muted-foreground/20 before:absolute before:-inset-3 before:content-['']"
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
                {t.affiliate.tagPresetLabel}
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
