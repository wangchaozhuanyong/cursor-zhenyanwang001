/**
 * Deprecation marker for legacy New Arrival hero keys in site_settings:
 * - newArrivalHeroImage
 * - newArrivalHeroTitle
 * - newArrivalHeroSubtitle
 * - newArrivalHeroCtaText
 *
 * We intentionally do not delete these keys for backward compatibility.
 * Runtime should ignore them and only use Home Ops keys:
 * - newArrivalSectionTitle
 * - newArrivalSectionSubtitle
 * - newArrivalDisplayCount
 * - newArrivalShowPrice
 * - newArrivalOnlyInStock
 */
module.exports = {
  async up() {
    // no-op by design
  },
};
