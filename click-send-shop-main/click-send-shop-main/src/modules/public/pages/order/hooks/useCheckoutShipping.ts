import { useEffect, useMemo, useState } from "react";
import { useShippingStore, calcShippingFee, estimateCartWeightKg } from "@/stores/useShippingStore";
import * as userShippingService from "@/services/userShippingService";
import type { CartItem } from "@/types/cart";
import type { Address } from "@/types/address";

export function useCheckoutShipping(items: CartItem[], rawTotal: number, selectedAddress?: Address | null) {
  const { templates: shippingTemplates, loading: shippingRulesLoading, loadError: shippingRulesError } = useShippingStore();
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [serverTemplateId, setServerTemplateId] = useState<string | null>(null);
  const [serverTemplateName, setServerTemplateName] = useState<string | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);

  useEffect(() => {
    useShippingStore.getState().loadTemplates();
  }, []);

  const enabledTemplates = useMemo(
    () => shippingTemplates.filter((template) => template.enabled),
    [shippingTemplates],
  );
  const selectedTemplate = enabledTemplates[0] ?? null;
  const selectedTemplateId = serverTemplateId ?? selectedTemplate?.id ?? null;
  const effectiveTemplate = selectedTemplateId
    ? enabledTemplates.find((template) => String(template.id) === String(selectedTemplateId)) ?? selectedTemplate
    : selectedTemplate;
  const effectiveTemplateName = serverTemplateName || effectiveTemplate?.name || selectedTemplate?.name || "";
  const weightKg = estimateCartWeightKg(items.map((item) => ({ qty: item.qty })));
  const destination = selectedAddress
    ? {
        country: selectedAddress.country,
        state: selectedAddress.state,
        city: selectedAddress.city,
        postcode: selectedAddress.postcode,
      }
    : undefined;
  const previewShippingFee = effectiveTemplate
    ? calcShippingFee(effectiveTemplate, rawTotal, { totalWeightKg: weightKg })
    : 0;

  useEffect(() => {
    const requestedTemplateId = selectedTemplate?.id ?? null;
    if (!requestedTemplateId || rawTotal < 0) {
      setServerShippingFee(null);
      setServerTemplateId(null);
      setServerTemplateName(null);
      setShippingQuoteError(null);
      return;
    }
    let cancelled = false;
    setShippingQuoteLoading(true);
    setShippingQuoteError(null);
    userShippingService
      .quoteShipping({
        shipping_template_id: requestedTemplateId,
        raw_amount: rawTotal,
        estimated_weight_kg: weightKg,
        destination,
      })
      .then((quote) => {
        if (!cancelled) {
          setServerShippingFee(Number(quote.shipping_fee));
          setServerTemplateId(quote.shipping_template_id ? String(quote.shipping_template_id) : null);
          setServerTemplateName(quote.shipping_name || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setServerShippingFee(null);
          setServerTemplateId(null);
          setServerTemplateName(null);
          setShippingQuoteError(error instanceof Error ? error.message : "运费规则加载失败");
        }
      })
      .finally(() => {
        if (!cancelled) setShippingQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate?.id, rawTotal, weightKg, selectedAddress?.country, selectedAddress?.state, selectedAddress?.city, selectedAddress?.postcode]);

  const baseShippingFee = serverShippingFee ?? previewShippingFee;

  return {
    selectedTemplate: effectiveTemplate ? { ...effectiveTemplate, id: String(selectedTemplateId || effectiveTemplate.id), name: effectiveTemplateName } : null,
    selectedTemplateId,
    selectedTemplateName: effectiveTemplateName,
    weightKg,
    previewShippingFee,
    baseShippingFee,
    shippingRulesLoading,
    shippingRulesError,
    shippingQuoteLoading,
    shippingQuoteError,
  };
}
