# Stripe Radar: what to turn on for $1 products

$1 courses are exactly what card-testing bots look for. The app already adds: login + Turnstile before checkout,
per-user and per-IP checkout limits, a checkout cool-off after 3 failed payments in an hour, and an email alert at
5 failed payments in 10 minutes (`FAILED_PAYMENT_ALERT_THRESHOLD`). Stripe Radar is the other half. **You enable these
in the Stripe Dashboard (do it in TEST mode first, then repeat in live).** I cannot and did not change your Stripe account.

## 1. Settings you can turn on with standard Radar (Dashboard -> Radar -> Rules)
- [ ] **Block if CVC verification fails**
- [ ] **Block if postal code verification fails** (watch for false declines on non-US/CA cards; review after a week)
- [ ] **Request 3D Secure if required** (leave at "if required"; consider "request when supported" if fraud shows up)
- [ ] **Block if Radar risk level is "highest"** and **Review if "elevated"** (these are the defaults - confirm they are on)

## 2. Custom rules (need "Radar for Fraud Teams", an add-on with a per-transaction fee: check current pricing)
Build these in Radar -> Rules -> Add rule. The rule editor autocompletes attribute names, and I wrote the names below
from memory, so confirm each one exists in your editor before saving.
- [ ] Block if the same IP address makes many charges in an hour (e.g. `:total_charges_per_ip_address_hourly: > 3`)
- [ ] Block if the same email makes many charges in a day (e.g. `:total_charges_per_email_daily: > 5`)
- [ ] Block if many different cards are tried from one IP/email in a day (e.g. `:card_count_for_ip_address_daily: > 2`)
- [ ] Block if the same card is charged many times in an hour
- [ ] Review (don't block) when the card country differs from the IP country, since this catches real fraud but also travellers
- [ ] Optional: block anonymous-proxy / high-risk IPs if your customers are unlikely to use VPNs

## 3. Other account settings
- [ ] Dashboard -> Settings -> Emails: turn on **dispute** and **failed payment** notifications to an address you read
- [ ] Dashboard -> Developers -> Webhooks: the endpoint must include `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`, `payment_intent.payment_failed`
      (and optionally `checkout.session.expired`)
- [ ] Set the **statement descriptor** to something recognisable ("DRCYBER.CA") so real customers don't dispute what they don't recognise
- [ ] Review **Radar -> Reviews** and **Disputes** weekly for the first month

## 4. How to read the app's alerts
- Email "burst of failed payments": open `/admin/orders` (Failed payments table). Many different `Student id`s failing with
  `card_declined` = card testing: tighten the Radar rules above, and consider lowering the checkout rate limits in
  `lib/actions/cart.ts`.
- Each dispute (a chargeback) costs a fee even at $1; the app revokes access immediately when a dispute opens.
