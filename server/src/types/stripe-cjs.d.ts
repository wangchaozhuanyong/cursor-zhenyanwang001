/**
 * stripe's CJS build is `module.exports = Stripe` (callable constructor), but the
 * published .d.ts shape doesn't model `new require('stripe')(key)` cleanly for checkJs.
 */
declare module "stripe" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Stripe: any;
  export = Stripe;
}
