PayoutService is a payment processing API for managing Stripe-based payouts. It handles connected account onboarding, payout method configuration, and earnings tracking - aggregating individual earnings into scheduled payouts via Stripe Global Payouts.

The service includes role-based access control (RBAC) to separate admin and user-level operations, and uses background processing (Sidekiq) for reliable payout execution and Stripe webhook handling.
