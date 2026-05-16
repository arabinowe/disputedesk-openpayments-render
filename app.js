const STORAGE_KEY = "openpayments.disputedesk.v1";
const BUSINESS_KEY = "openpayments.disputedesk.business.v1";
const FEEDBACK_KEY = "openpayments.disputedesk.feedback.v1";
const PAYMENTS_KEY = "openpayments.disputedesk.payments.v1";
const INCOME_EVIDENCE_KEY = "openpayments.disputedesk.income-evidence.v1";
const LEADS_KEY = "openpayments.disputedesk.leads.v1";
const OPS_ACTIONS_KEY = "openpayments.disputedesk.ops-actions.v1";
const LICENSE_KEY = "openpayments.disputedesk.license.v1";
const APP_VERSION = "0.1.0";
const BACKEND_REPO_URL = "https://github.com/arabinowe/disputedesk-openpayments";
const DEPLOY_TO_RENDER_URL = "https://render.com/deploy?repo=https://github.com/arabinowe/disputedesk-openpayments";
const CORE_PLAN_PRICE = 99;
const LEGACY_GROWTH_PAYMENT_LINK = "https://buy.stripe.com/fZuaEZ8Zc4zC4fI8EJgw001";
let workspaceSaveTimer = null;
let workspaceSyncInFlight = false;

const defaultBusinessSettings = {
  websiteUrl: "",
  backendUrl: "",
  businessEmail: "disputedeskservice@gmail.com",
  businessLegalName: "AR Trading",
  payoutBankLabel: "Chase Business account - AR Trading",
  monthlyBudget: 25,
  planPrice: CORE_PLAN_PRICE,
  conversionRate: 5,
  grossMargin: 88,
  coreLink: "",
  starterLink: "",
  trialLink: "",
  growthLink: "",
  scaleLink: "",
  googleTagId: "",
  googleAdsSendTo: "",
  metaPixelId: "",
  redditPixelId: "",
  linkedinPartnerId: "",
  linkedinConversionId: "",
  fundingCardLabel: "Robinhood virtual card - Ads",
  fundingMonthlyCap: 25,
  dailyAdCap: 5,
  maxCac: 160,
  autopilotMode: "approval",
  stripeAccountMode: "payment_links",
  googleAdsCustomerId: "",
  metaAdAccountId: "",
  metaBusinessPortfolioId: "",
  redditAdAccountId: "",
  directOutreachList: "",
  backendRepoUrl: BACKEND_REPO_URL,
  deployToRenderUrl: DEPLOY_TO_RENDER_URL,
  completedSystems: {}
};

const pricingPlans = [
  {
    key: "core",
    name: "DisputeDesk Core",
    price: CORE_PLAN_PRICE,
    cadence: "/mo, cancel anytime",
    description: "One self-serve subscription for merchants who need chargeback evidence, deadline tracking, and rebuttal drafts without sales calls or revenue-share pricing.",
    features: ["CSV dispute import", "Reason-specific evidence checklists", "Deadline and exposure dashboard", "Packet QA before export", "AI-assisted rebuttal drafts", "Customer feedback loop"],
    linkKey: "coreLink",
    featured: true
  }
];

const marketResearch = [
  {
    feature: "Reason-specific evidence builder",
    need: "Stripe guides merchants to provide dispute-reason-specific text and images, so generic packets are a real workflow gap.",
    willingness: "Chargeflow prices recovery at 25% of won chargebacks; Disputifier prices recovery at 20% of won chargebacks.",
    decision: "Core feature. Sell one fixed-price plan at $99/month, cancel anytime, so the value is simple and undercuts percentage-of-recovery tools for merchants with meaningful dispute volume."
  },
  {
    feature: "Deadline and exposure dashboard",
    need: "A chargeback immediately reverses the payment and adds dispute fees, so merchants need a quick view of what is at risk.",
    willingness: "Merchants already pay for tools that reduce manual submission time and recovered revenue leakage.",
    decision: "Core feature. Keeps the value visible every login."
  },
  {
    feature: "CSV-first imports",
    need: "Small merchants can export disputes today without waiting for OAuth approvals or processor app review.",
    willingness: "Low setup friction improves conversion for a $99 self-serve plan.",
    decision: "Launch feature. Stripe OAuth comes after paid signal."
  },
  {
    feature: "Stripe Payment Link checkout",
    need: "Stripe supports no-code payment links for products and subscriptions, making checkout cheap to launch.",
    willingness: "Customers can buy without a sales call; the business avoids storing card data.",
    decision: "Launch feature. Sell the software plainly and let buyers take it or leave it."
  },
  {
    feature: "Paid acquisition cockpit",
    need: "The buyer can be reached with search intent, ecommerce/operator audiences, and merchant pain communities.",
    willingness: "Start with a $25 signal test. Budget only scales when CAC is below the payback guardrail or prospects explicitly ask to buy.",
    decision: "Launch feature. It makes the software sell itself digitally without pretending the first ad test is a growth engine."
  },
  {
    feature: "Fully automated dispute submission",
    need: "Competitors sell hands-off automation, but it needs deeper integrations, security controls, and processor approvals.",
    willingness: "High, but operational risk is higher for a faceless solo-operated web business.",
    decision: "Defer. Validate self-serve packets first."
  }
];

const costStack = [
  {
    item: "Static hosting",
    monthly: 0,
    choice: "GitHub Pages, Cloudflare Pages, or Netlify free tier",
    reason: "The storefront and product demo run as static files. Use the Node server only when webhook fulfillment is needed."
  },
  {
    item: "Checkout",
    monthly: 0,
    choice: "Stripe Payment Links",
    reason: "No custom checkout code, no card storage, no subscription billing infrastructure to maintain."
  },
  {
    item: "CRM",
    monthly: 0,
    choice: "Local CSV export first",
    reason: "Lead capture stores locally in static mode or writes JSON on the tiny server. Upgrade only after real lead volume."
  },
  {
    item: "Analytics",
    monthly: 0,
    choice: "GA4 plus ad pixels",
    reason: "Free measurement for early acquisition tests. Avoid paid attribution tools until spend justifies them."
  },
  {
    item: "Email",
    monthly: 0,
    choice: "Self-serve receipts plus asynchronous support",
    reason: "Use Stripe receipts, documentation, and a support inbox for access or billing issues only. Do not sell calls, consulting, or done-for-you service."
  },
  {
    item: "Backend",
    monthly: 0,
    choice: "Optional small Node process",
    reason: "Run locally or on a low/free tier. Required only for webhook persistence and server-side lead capture."
  },
  {
    item: "Ad spend",
    monthly: "variable",
    choice: "$25 Reddit validation first",
    reason: "Buy only a small signal before scaling. Increase spend only after a live paid checkout or strong self-serve feedback signal."
  }
];

const profitPlaybook = [
  {
    title: "Sell one fixed-price outcome",
    description: "Lead with DisputeDesk Core at $99/month, cancel anytime: organize chargeback evidence, track deadlines, and export a reviewed rebuttal draft before manual processor submission."
  },
  {
    title: "Keep gross margin excellent",
    description: "Default stack uses static hosting, Stripe Payment Links, local JSONL storage, and self-serve onboarding. Costs should stay near zero before payment processing and ad spend."
  },
  {
    title: "Scale only from proof",
    description: "The $25 test must produce paid intent before more spend. Raise budget only when CAC payback is inside the first month or self-serve expansion revenue covers the experiment."
  }
];

const businessOperationNorms = [
  {
    title: "Revenue first",
    description: "Core checkout, paid customer records, and payout readiness are monitored before any ad budget increase."
  },
  {
    title: "Spend capped",
    description: "No campaign should exceed the configured virtual-card cap, daily ad cap, or first-month CAC guardrail."
  },
  {
    title: "Support queue",
    description: "Leads, paid customers, and feedback produce action items so customer outcomes drive the next release."
  },
  {
    title: "Compliance before scale",
    description: "Terms, privacy, refund policy, AI disclosure, no-guarantee claims, and ad-platform rules are checked before growth spend."
  },
  {
    title: "Provider rails",
    description: "Stripe holds payments, ad platforms hold ad billing, and this app coordinates through official links, webhooks, and APIs."
  },
  {
    title: "Audit trail",
    description: "Operator runs, customer records, feedback, and leads are exportable so the business can be reviewed without relying on memory."
  }
];

const marketConfidence = [
  {
    signal: "Processor workflow creates the need",
    evidence: "Stripe says merchants can challenge disputes by submitting evidence through the Dashboard or API, and that evidence must be strong and submitted before the deadline.",
    implication: "A workspace that organizes deadline, reason, and evidence quality maps directly to the real workflow."
  },
  {
    signal: "Merchants lose cash immediately",
    evidence: "Shopify explains that when a chargeback occurs, the disputed amount and fee can be deducted while the issuer reviews evidence.",
    implication: "The pain is cash and operations, not curiosity. This supports willingness to pay."
  },
  {
    signal: "Outcome is not controlled by the tool",
    evidence: "Stripe and Shopify both clarify that the issuer/cardholder bank decides the dispute outcome.",
    implication: "Our honest claim is better packet workflow, not guaranteed wins."
  },
  {
    signal: "Existing vendors validate spend",
    evidence: "Chargeflow publicly references a 25% fee on successful chargeback wins; Disputifier lists 20% of recovered revenue for chargeback recovery.",
    implication: "A $79-$299 fixed monthly self-serve plan can undercut revenue-share tools while preserving strong margins and avoiding service delivery."
  },
  {
    signal: "Low-cost acquisition is plausible",
    evidence: "Search intent exists around Stripe/Shopify chargebacks, Reddit has merchant pain communities, and Meta can retarget site visitors and ecommerce operators.",
    implication: "The $25 test should measure paid intent, not scale. Increase spend only after merchant replies or checkout intent."
  }
];

const registrationCatalog = [
  {
    key: "businessIdentity",
    title: "Business identity",
    description: "Operate as a sole proprietor, and file a DBA/trade name if you market under a name other than your legal name.",
    required: true
  },
  {
    key: "taxSetup",
    title: "Tax and banking setup",
    description: "Use the Chase Business account registered as AR Trading for Stripe payouts, collect tax records, and consider an EIN even when not legally required.",
    required: true
  },
  {
    key: "domainEmail",
    title: "Domain and email",
    description: "Buy a domain, set up a business email address, and use that identity for Stripe, Meta, support, and customer receipts.",
    required: true
  },
  {
    key: "websitePolicies",
    title: "Website policies",
    description: "Publish privacy, terms, refund/cancellation, AI-assistance, and no-legal-advice disclosures before running ads.",
    required: true
  },
  {
    key: "stripeMerchant",
    title: "Stripe merchant account",
    description: "Create Stripe products and Payment Links. Enter the capped virtual card only in provider billing pages, not this app.",
    required: true
  },
  {
    key: "metaBusiness",
    title: "Meta business setup",
    description: "Create a Meta business portfolio, ad account, dataset/pixel, verified domain, and billing method with the capped virtual card.",
    required: true
  },
  {
    key: "analyticsConsent",
    title: "Analytics and consent",
    description: "Install Meta Pixel and GA4 only with a privacy policy that describes tracking and any required consent flow for your target markets.",
    required: true
  },
  {
    key: "supportLoop",
    title: "Support and feedback",
    description: "Create a support email and review the feedback dashboard weekly to steer releases toward customer outcomes.",
    required: true
  }
];

const cashAccessChecklist = [
  {
    key: "stripeBank",
    title: "Chase Business payout account linked in Stripe",
    description: "Inside Stripe, add the Chase Business account registered as AR Trading. Store only this label here; never store routing or account numbers in this app."
  },
  {
    key: "stripeIdentity",
    title: "Stripe identity and tax details complete",
    description: "Complete Stripe's required owner, business, tax, and payout verification for AR Trading before running meaningful traffic."
  },
  {
    key: "stripeBusinessMatch",
    title: "Stripe business name matches payout account",
    description: "Confirm Stripe's public business/legal details are consistent with AR Trading and the Chase Business account to reduce payout holds."
  },
  {
    key: "paymentLinksLive",
    title: "Live Payment Links active",
    description: "Use one live-mode Stripe Payment Link for DisputeDesk Core at $99/month, cancel anytime. Test links do not produce cash access."
  },
  {
    key: "webhookLive",
    title: "Live webhook configured",
    description: "Send checkout.session.completed events to /api/stripe/webhook so DisputeDesk can monitor customers and revenue."
  },
  {
    key: "payoutSchedule",
    title: "Payout schedule reviewed",
    description: "Confirm payout timing and reserves in Stripe. Stripe controls payout availability, not this webapp."
  },
  {
    key: "refundProcess",
    title: "Refund and cancellation process ready",
    description: "Document how you handle refunds, cancellations, and support requests before taking paid traffic."
  }
];

const adQualityStandards = [
  {
    title: "Claim discipline",
    standard: "Use operational claims only: organize evidence, track deadlines, export packets. Disclose that it is AI-assisted software built with Codex from OpenAI. Do not promise wins, income, legal outcomes, processor decisions, or liability coverage.",
    source: "FTC/Meta/Google claim safety"
  },
  {
    title: "Ad-to-page match",
    standard: "Every ad points to the chargeback evidence offer, shows pricing, explains AI assistance, and includes privacy/terms/refund disclosures before checkout.",
    source: "Google landing page experience"
  },
  {
    title: "Meta-safe language",
    standard: "Do not imply sensitive personal attributes or vulnerable financial status. Say 'small merchants' or 'online stores,' not 'are you losing money?'",
    source: "Meta personal attributes"
  },
  {
    title: "No day-job graph",
    standard: "No LinkedIn spend. Keep acquisition to Google intent, Reddit merchant contexts, Meta ecommerce audiences, and brand-led outreach outside personal identity.",
    source: "Operator boundary"
  },
  {
    title: "Conversion hygiene",
    standard: "Track page view, lead, checkout intent, feedback, and purchase. For this launch, run Reddit only at $5/day for 5 days and judge by paid checkout or three strong self-serve feedback submissions.",
    source: "Platform attribution"
  },
  {
    title: "Spend safety",
    standard: "Use the capped virtual card in provider billing pages only. Daily cap stays at or below $5 until a buying signal appears.",
    source: "Operating control"
  }
];

const adCreativeLibrary = [
  {
    channel: "Google Search",
    angle: "High-intent dispute evidence",
    headlines: [
      "Stripe dispute evidence workspace",
      "Build chargeback evidence faster",
      "Chargeback packet templates"
    ],
    description: "AI-assisted evidence workspace built with Codex from OpenAI. Fixed-price software. No win guarantees.",
    keywords: ["stripe dispute evidence", "chargeback evidence template", "shopify chargeback dispute", "chargeback rebuttal letter"],
    negatives: ["free", "job", "lawyer", "attorney", "credit card dispute consumer", "bank dispute"]
  },
  {
    channel: "Meta Ads",
    angle: "Workflow pain without personal-attribute claims",
    headlines: [
      "A calmer chargeback evidence workflow",
      "Dispute packets without the spreadsheet sprawl",
      "For online stores managing disputes"
    ],
    description: "AI-assisted, fixed-price software for evidence timelines and draft rebuttals. Review outputs before use.",
    keywords: ["Shopify interests", "ecommerce page admins", "small business software", "retargeting site visitors"],
    negatives: ["guaranteed wins", "recover every chargeback", "you are losing money", "get rich", "legal advice"]
  },
  {
    channel: "Reddit Ads",
    angle: "Operator-to-operator practical tool",
    headlines: [
      "Chargeback evidence is easier with a checklist",
      "A lightweight dispute packet workspace",
      "Keep chargeback work out of random docs"
    ],
    description: "Import dispute records, follow AI-assisted evidence checklists, and export a draft without paying a recovery percentage.",
    keywords: ["r/shopify", "r/ecommerce", "r/stripe", "chargeback keywords"],
    negatives: ["personal finance", "consumer dispute", "bankruptcy", "crypto", "investment"]
  },
  {
    channel: "Direct outreach",
    angle: "Customer discovery before scaling",
    headlines: [
      "Can DisputeDesk pressure-test your chargeback workflow?",
      "A lightweight dispute evidence workspace",
      "Looking for merchant feedback on chargeback software"
    ],
    description: "Short, transparent brand message asking for workflow feedback, not a fake partnership or mass pitch.",
    keywords: ["Shopify agencies", "Stripe consultants", "indie ecommerce operators", "merchant ops groups"],
    negatives: ["scraped personal emails", "day-job contacts", "mass cold spam", "misleading affiliation"]
  }
];

const channelCatalog = [
  {
    key: "google",
    name: "Google Search",
    share: 0,
    barrier: "Low",
    score: "Deferred",
    cpc: 6,
    why: "High intent but likely too few clicks on a $25 cap. Keep as the next paid test after checkout and payout readiness are proven.",
    targets: ["stripe dispute evidence", "fight chargeback stripe", "chargeback rebuttal letter", "shopify chargeback help"],
    headline: "Build better Stripe dispute evidence",
    body: "Fixed-price software for organizing chargeback evidence and rebuttal drafts. No win guarantees, no revenue share."
  },
  {
    key: "reddit",
    name: "Reddit Ads",
    share: 100,
    barrier: "Low",
    score: "Selected cheapest test",
    cpc: 3,
    why: "Cheapest paid test for this venture: one promoted post at $5/day for 5 days, pointed straight at the self-serve storefront.",
    targets: ["r/stripe", "r/shopify", "r/ecommerce", "keywords: chargeback, dispute, payment processor"],
    headline: "Chargeback evidence without revenue share",
    body: "Import disputes, follow a reason-specific checklist, and export a rebuttal draft. Use at your own discretion."
  },
  {
    key: "meta",
    name: "Meta Ads",
    share: 0,
    barrier: "Low",
    score: "Retarget later",
    cpc: 4,
    why: "Keep Meta pixel/account setup available, but do not spend here until the Reddit test produces self-serve buying signal.",
    targets: ["US ecommerce page admins", "Shopify and ecommerce interests", "small business admins", "site visitor retargeting after pixel setup"],
    headline: "A fixed-price chargeback evidence workspace",
    body: "A practical tool for evidence checklists, deadlines, and rebuttal drafts. No outcome guarantees."
  },
  {
    key: "direct",
    name: "Brand direct outreach",
    share: 0,
    barrier: "Low",
    score: "No ad platform",
    cpc: 0,
    why: "Useful for learning language, but it creates more direct interaction. Keep the first go-to-market motion as self-serve paid traffic.",
    targets: ["Shopify agency partners", "Indie ecommerce operators", "Stripe-focused consultants", "Merchant communities outside personal identity"],
    headline: "Can DisputeDesk pressure-test your chargeback workflow?",
    body: "A short brand-led demo is cheaper than LinkedIn spend and gives stronger customer language for the next release."
  },
  {
    key: "linkedin",
    name: "LinkedIn Ads",
    share: 0,
    barrier: "Avoided",
    score: "Disabled",
    cpc: 0,
    disabled: true,
    why: "Intentionally excluded to avoid touching the operator's day-job identity or professional graph.",
    targets: ["Do not run LinkedIn paid spend"],
    headline: "LinkedIn disabled",
    body: "Use Google, Meta, Reddit, and direct outreach instead."
  }
];

const systemsCatalog = [
  {
    key: "stripeAccount",
    title: "Stripe account",
    owner: "Operator",
    description: "Create one DisputeDesk Core subscription product at $99/month, cancel anytime. Use Stripe-hosted checkout so card data never touches this app.",
    launchNow: true
  },
  {
    key: "stripePaymentLinks",
    title: "Stripe Payment Links",
    owner: "Operator",
    description: "Paste the Core Payment Link into Launch Cockpit. Configure after-payment redirect back to this site.",
    launchNow: true
  },
  {
    key: "stripeWebhook",
    title: "Stripe webhook",
    owner: "Server",
    description: "Point checkout.session.completed events to /api/stripe/webhook on the included Node server.",
    launchNow: true
  },
  {
    key: "analyticsTags",
    title: "Analytics and pixels",
    owner: "Marketing",
    description: "Add Google, Meta, and Reddit IDs in Launch Cockpit to activate page, lead, checkout, and purchase events. LinkedIn is intentionally unused.",
    launchNow: true
  },
  {
    key: "metaPixel",
    title: "Meta Pixel and CAPI",
    owner: "Marketing",
    description: "Use Meta Pixel for browser events and optional server-side Conversions API with META_PIXEL_ID and META_ACCESS_TOKEN on the server.",
    launchNow: true
  },
  {
    key: "leadCapture",
    title: "Lead capture",
    owner: "Server",
    description: "The lead form posts to /api/leads when deployed with the included server and falls back gracefully for static demos.",
    launchNow: true
  },
  {
    key: "emailOps",
    title: "Self-serve email ops",
    owner: "Operator",
    description: "Use automated receipts, onboarding links, and compliant asynchronous nurture. Do not sell calls, consulting, or done-for-you delivery.",
    launchNow: true
  },
  {
    key: "freeHosting",
    title: "Free static hosting",
    owner: "Operator",
    description: "Deploy the storefront to a free static host first. Add paid infrastructure only after paid customers require it.",
    launchNow: true
  },
  {
    key: "avoidLinkedin",
    title: "Avoid LinkedIn spend",
    owner: "Operator",
    description: "Keep acquisition away from day-job identity and professional graph. Use Google Search, Reddit, Meta retargeting, and brand-led outreach instead.",
    launchNow: true
  },
  {
    key: "processorOauth",
    title: "Processor OAuth",
    owner: "Later",
    description: "Stripe/Shopify live dispute intake after the first paying customers prove the workflow.",
    launchNow: false
  },
  {
    key: "autoSubmission",
    title: "Automatic representment",
    owner: "Later",
    description: "Automated evidence submission only after security, approval, and customer authorization controls are in place.",
    launchNow: false
  }
];

const reasonCatalog = {
  fraudulent: {
    label: "Fraudulent",
    baseline: 28,
    focus: "Show legitimate authorization, identity match, account access, and usage after purchase.",
    checklist: [
      ["avs_cvc", "AVS and CVC result", "Attach processor fields showing billing address and CVC checks."],
      ["ip_device", "IP and device record", "Show login, checkout, and usage IPs with timestamps."],
      ["customer_history", "Customer history", "Include prior successful orders, account age, or subscription history."],
      ["service_usage", "Post-purchase usage", "Show downloads, logins, shipments, or consumed service value."],
      ["policy_visibility", "Checkout policy visibility", "Prove the cardholder saw terms, descriptor, and refund policy."]
    ]
  },
  product_not_received: {
    label: "Product not received",
    baseline: 44,
    focus: "Prove fulfillment or access, then connect delivery to the disputed order.",
    checklist: [
      ["receipt", "Order receipt", "Include itemized receipt, amount, billing details, and timestamp."],
      ["tracking", "Carrier or access proof", "Attach tracking, delivery scan, login record, or activation event."],
      ["address_match", "Address match", "Show the delivered address matches the checkout address."],
      ["customer_communication", "Customer messages", "Include messages confirming order, delivery, or usage."],
      ["fulfillment_timeline", "Fulfillment timeline", "Show purchase, shipment, delivery, and follow-up events."]
    ]
  },
  product_unacceptable: {
    label: "Product unacceptable",
    baseline: 36,
    focus: "Show the product matched the offer and that support or replacement options were available.",
    checklist: [
      ["product_page", "Product page snapshot", "Show exactly what was advertised at purchase."],
      ["receipt", "Order receipt", "Include itemized receipt, amount, and accepted terms."],
      ["support_history", "Support history", "Attach support replies, replacements, credits, or troubleshooting."],
      ["return_policy", "Return policy", "Show the return policy and whether the customer followed it."],
      ["usage_or_delivery", "Use or delivery proof", "Show delivery, activation, download, or service usage."]
    ]
  },
  duplicate: {
    label: "Duplicate charge",
    baseline: 58,
    focus: "Show the disputed charge was separate, authorized, and tied to a different order or invoice.",
    checklist: [
      ["receipt", "Receipt for disputed charge", "Attach the order receipt connected to this payment."],
      ["comparison", "Charge comparison", "Compare amount, date, product, and order IDs between charges."],
      ["separate_authorization", "Separate authorization", "Show independent checkout, invoice, or renewal authorization."],
      ["customer_communication", "Customer messages", "Attach any explanation sent to the customer."],
      ["refund_record", "Refund record", "Show no duplicate refund is already owed or that one was issued."]
    ]
  },
  subscription_canceled: {
    label: "Canceled subscription",
    baseline: 40,
    focus: "Prove cancellation terms, renewal notice, access after renewal, and support response.",
    checklist: [
      ["subscription_terms", "Subscription terms", "Attach accepted renewal and cancellation language."],
      ["renewal_notice", "Renewal notice", "Show reminder, invoice, or receipt delivery."],
      ["access_logs", "Access after renewal", "Attach usage or account access after the billed date."],
      ["cancel_timeline", "Cancellation timeline", "Show when cancellation happened relative to the charge."],
      ["support_history", "Support history", "Include support replies, credits, or concessions."]
    ]
  },
  credit_not_processed: {
    label: "Credit not processed",
    baseline: 50,
    focus: "Show refund eligibility, refund status, or why no credit was owed.",
    checklist: [
      ["refund_policy", "Refund policy", "Attach the policy accepted at checkout."],
      ["refund_record", "Refund or denial record", "Show refund ID, amount, date, or written denial reason."],
      ["customer_communication", "Customer messages", "Include refund request and merchant response."],
      ["service_usage", "Usage or delivery proof", "Show value delivered before the refund request."],
      ["timeline", "Timeline", "Connect purchase, request, response, and dispute dates."]
    ]
  },
  general: {
    label: "General",
    baseline: 34,
    focus: "Build a concise timeline and attach only evidence that answers the stated claim.",
    checklist: [
      ["receipt", "Order receipt", "Attach the itemized purchase record."],
      ["timeline", "Timeline", "Show the sequence from purchase to dispute."],
      ["customer_communication", "Customer messages", "Attach the clearest messages related to the claim."],
      ["policy_visibility", "Policy visibility", "Show terms, descriptor, cancellation, or refund policy."],
      ["service_usage", "Delivery or usage proof", "Attach fulfillment, login, or usage records."]
    ]
  }
};

const statusLabels = {
  collecting: "Collecting",
  ready: "Ready",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost"
};

const processorGuides = {
  stripe: {
    label: "Stripe Dashboard",
    destination: "Payments > Disputes > Counter dispute",
    steps: [
      "Open the dispute before the evidence deadline.",
      "Choose Counter dispute only after the packet is complete.",
      "Attach one consolidated file per evidence type when needed.",
      "Submit once after reviewing every claim and file."
    ]
  },
  "shopify payments": {
    label: "Shopify admin",
    destination: "Orders > chargeback or inquiry response",
    steps: [
      "Open the chargeback from the Shopify admin notification.",
      "Review the issuer claim and dispute reason before writing the response.",
      "Add delivery, policy, support, and timeline evidence that directly matches the reason.",
      "Submit before Shopify's response deadline and keep the exported packet for records."
    ]
  },
  paypal: {
    label: "PayPal Resolution Center",
    destination: "Resolution Center > case details",
    steps: [
      "Open the case in the Resolution Center.",
      "Match the packet to the PayPal reason and requested response fields.",
      "Attach proof of delivery, customer communications, and policy records.",
      "Submit once and record the case status in DisputeDesk."
    ]
  },
  adyen: {
    label: "Adyen Customer Area",
    destination: "Risk > Disputes",
    steps: [
      "Open the dispute in Customer Area.",
      "Use the dispute reason to select the strongest matching evidence.",
      "Upload the response package according to Adyen's file requirements.",
      "Mark the record submitted here after the processor confirms receipt."
    ]
  },
  default: {
    label: "Processor dashboard",
    destination: "Dispute or chargeback response area",
    steps: [
      "Open the processor's dispute response page.",
      "Confirm the deadline, amount, reason, and allowed evidence fields.",
      "Upload only relevant evidence that answers the claim.",
      "Save the confirmation and update the status in DisputeDesk."
    ]
  }
};

const sampleDisputes = [
  {
    id: "du_93L2HW",
    processor: "Stripe",
    orderId: "#4921",
    customer: "Marina Blake",
    email: "marina.blake@example.com",
    amount: 782.4,
    reason: "product_not_received",
    dueDate: "2026-05-21",
    status: "collecting",
    product: "Expedited hardware bundle",
    notes: "Customer selected two-day shipping. Carrier scan shows delivered to the same checkout address.",
    evidence: ["receipt", "tracking", "address_match", "fulfillment_timeline"],
    narrative: ""
  },
  {
    id: "du_77A8QP",
    processor: "Shopify Payments",
    orderId: "#4886",
    customer: "Nolan Reyes",
    email: "nolan.reyes@example.com",
    amount: 219.99,
    reason: "fraudulent",
    dueDate: "2026-05-18",
    status: "ready",
    product: "Annual pro plan",
    notes: "Same user logged in from the checkout IP and exported reports after purchase.",
    evidence: ["avs_cvc", "ip_device", "service_usage", "policy_visibility"],
    narrative: ""
  },
  {
    id: "du_38PVK9",
    processor: "Stripe",
    orderId: "#4810",
    customer: "Avery Chen",
    email: "avery.chen@example.com",
    amount: 1299,
    reason: "subscription_canceled",
    dueDate: "2026-05-27",
    status: "submitted",
    product: "Quarterly managed analytics service",
    notes: "Cancellation was requested nine days after renewal. Account had two project exports after invoice.",
    evidence: ["subscription_terms", "renewal_notice", "access_logs", "cancel_timeline", "support_history"],
    narrative: ""
  },
  {
    id: "du_52KLM4",
    processor: "PayPal",
    orderId: "#4772",
    customer: "Priya Singh",
    email: "priya.singh@example.com",
    amount: 448.75,
    reason: "product_unacceptable",
    dueDate: "2026-05-17",
    status: "collecting",
    product: "Custom onboarding package",
    notes: "Customer approved the final deliverable by email before filing the dispute.",
    evidence: ["receipt", "support_history"],
    narrative: ""
  }
];

const state = {
  disputes: loadDisputes(),
  business: loadBusinessSettings(),
  feedback: loadFeedback(),
  payments: loadPayments(),
  incomeEvidence: loadIncomeEvidence(),
  leads: loadLeads(),
  opsActions: loadOpsActions(),
  license: loadLicense(),
  serverStatus: null,
  profitReport: null,
  feedbackFilters: {
    search: "",
    type: "all",
    priority: "all"
  },
  selectedId: null,
  search: "",
  status: "all",
  reason: "all"
};

const elements = {
  accessGate: document.querySelector("#accessGate"),
  licenseForm: document.querySelector("#licenseForm"),
  licenseStatus: document.querySelector("#licenseStatus"),
  licenseCheckoutLink: document.querySelector("#licenseCheckoutLink"),
  pricingGrid: document.querySelector("#pricingGrid"),
  profitGrid: document.querySelector("#profitGrid"),
  researchGrid: document.querySelector("#researchGrid"),
  marketConfidence: document.querySelector("#marketConfidence"),
  businessForm: document.querySelector("#businessForm"),
  autopilotForm: document.querySelector("#autopilotForm"),
  operatorList: document.querySelector("#operatorList"),
  launchMetrics: document.querySelector("#launchMetrics"),
  breakEvenNote: document.querySelector("#breakEvenNote"),
  channelGrid: document.querySelector("#channelGrid"),
  adQualityGrid: document.querySelector("#adQualityGrid"),
  costStack: document.querySelector("#costStack"),
  registrationGrid: document.querySelector("#registrationGrid"),
  systemsGrid: document.querySelector("#systemsGrid"),
  leadForm: document.querySelector("#leadForm"),
  feedbackForm: document.querySelector("#feedbackForm"),
  feedbackSummary: document.querySelector("#feedbackSummary"),
  feedbackList: document.querySelector("#feedbackList"),
  feedbackSearch: document.querySelector("#feedbackSearch"),
  feedbackTypeFilter: document.querySelector("#feedbackTypeFilter"),
  feedbackPriorityFilter: document.querySelector("#feedbackPriorityFilter"),
  feedbackAdminToken: document.querySelector("#feedbackAdminToken"),
  paymentSummary: document.querySelector("#paymentSummary"),
  paymentList: document.querySelector("#paymentList"),
  cashAccessList: document.querySelector("#cashAccessList"),
  systemHealth: document.querySelector("#systemHealth"),
  incomeEvidence: document.querySelector("#incomeEvidence"),
  opsSummary: document.querySelector("#opsSummary"),
  operationNorms: document.querySelector("#operationNorms"),
  opsActionList: document.querySelector("#opsActionList"),
  primaryCheckoutLink: document.querySelector("#primaryCheckoutLink"),
  metricGrid: document.querySelector("#metricGrid"),
  topMonitorGrid: document.querySelector("#topMonitorGrid"),
  topMonitorNote: document.querySelector("#topMonitorNote"),
  deploymentStrip: document.querySelector("#deploymentStrip"),
  credentialGrid: document.querySelector("#credentialGrid"),
  credentialNote: document.querySelector("#credentialNote"),
  profitAction: document.querySelector("#profitAction"),
  profitEconomics: document.querySelector("#profitEconomics"),
  disputeList: document.querySelector("#disputeList"),
  queueCount: document.querySelector("#queueCount"),
  sideRevenue: document.querySelector("#sideRevenue"),
  sideConfidence: document.querySelector("#sideConfidence"),
  detailEmpty: document.querySelector("#detailEmpty"),
  detailContent: document.querySelector("#detailContent"),
  detailProcessor: document.querySelector("#detailProcessor"),
  detailName: document.querySelector("#detailName"),
  detailSummary: document.querySelector("#detailSummary"),
  customerFitGrid: document.querySelector("#customerFitGrid"),
  packetQa: document.querySelector("#packetQa"),
  confidenceText: document.querySelector("#confidenceText"),
  confidenceBar: document.querySelector("#confidenceBar"),
  evidenceChecklist: document.querySelector("#evidenceChecklist"),
  narrativeInput: document.querySelector("#narrativeInput"),
  roiGrid: document.querySelector("#roiGrid"),
  playbookList: document.querySelector("#playbookList"),
  statusEditor: document.querySelector("#statusEditor"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  reasonFilter: document.querySelector("#reasonFilter"),
  reasonSelect: document.querySelector("#reasonSelect"),
  disputeDialog: document.querySelector("#disputeDialog"),
  disputeForm: document.querySelector("#disputeForm"),
  toast: document.querySelector("#toast")
};

initialize();

function initialize() {
  populateReasonControls();
  attachEvents();
  hydrateLicenseFromUrl();
  if (state.disputes.length > 0) {
    state.selectedId = state.disputes[0].id;
  }
  render();
  syncBusinessRegister({ quiet: true });
  syncLicenseStatus({ quiet: true });
  syncCredentialsStatus({ quiet: true });
  syncProfitReport({ quiet: true });
}

function attachEvents() {
  elements.licenseForm.addEventListener("submit", verifyLicense);
  elements.businessForm.addEventListener("submit", saveBusinessSettings);
  elements.businessForm.addEventListener("input", updateBusinessPreview);
  elements.autopilotForm.addEventListener("submit", saveOperatorRules);
  elements.autopilotForm.addEventListener("input", updateBusinessPreview);
  document.querySelector("#exportOperatorButton").addEventListener("click", exportOperatorConfig);
  elements.leadForm.addEventListener("submit", submitLead);
  elements.feedbackForm.addEventListener("submit", submitFeedback);
  document.querySelector("#exportFeedbackButton").addEventListener("click", exportFeedback);
  document.querySelector("#syncFeedbackButton").addEventListener("click", syncServerFeedback);
  document.querySelector("#syncPaymentsButton").addEventListener("click", syncServerPayments);
  document.querySelector("#syncIncomeButton").addEventListener("click", syncIncomeEvidence);
  document.querySelector("#syncAllButton").addEventListener("click", syncAllBusinessData);
  document.querySelector("#runOpsButton").addEventListener("click", runAutonomousOpsCycle);
  document.querySelector("#checkHealthButton").addEventListener("click", checkSystemHealth);
  document.querySelector("#topCheckHealthButton").addEventListener("click", syncAllBusinessData);
  document.querySelector("#topSyncIncomeButton").addEventListener("click", () => syncIncomeEvidence());
  document.querySelector("#topRunOpsButton").addEventListener("click", runAutonomousOpsCycle);
  document.querySelector("#syncCredentialsButton").addEventListener("click", syncCredentialsStatus);
  document.querySelector("#syncProfitButton").addEventListener("click", syncProfitReport);
  elements.feedbackSearch.addEventListener("input", event => {
    state.feedbackFilters.search = event.target.value.trim().toLowerCase();
    renderFeedback();
  });
  elements.feedbackTypeFilter.addEventListener("change", event => {
    state.feedbackFilters.type = event.target.value;
    renderFeedback();
  });
  elements.feedbackPriorityFilter.addEventListener("change", event => {
    state.feedbackFilters.priority = event.target.value;
    renderFeedback();
  });
  document.querySelector("#newDisputeButton").addEventListener("click", openDialog);
  document.querySelector("#closeDialogButton").addEventListener("click", closeDialog);
  document.querySelector("#cancelDialogButton").addEventListener("click", closeDialog);
  document.querySelector("#seedButton").addEventListener("click", () => {
    if (!ensureProductAccess("load sample disputes")) return;
    state.disputes = clone(sampleDisputes);
    state.selectedId = state.disputes[0]?.id ?? null;
    persist();
    render();
    notify("Sample dispute queue loaded.");
  });
  document.querySelector("#clearButton").addEventListener("click", () => {
    if (!ensureProductAccess("clear product data")) return;
    if (!confirm("Clear local DisputeDesk data?")) return;
    state.disputes = [];
    state.selectedId = null;
    persist();
    render();
    notify("Local dispute data cleared.");
  });
  document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
  document.querySelector("#csvInput").addEventListener("change", importCsv);
  document.querySelector("#copyPacketButton").addEventListener("click", copyPacket);
  document.querySelector("#downloadPacketButton").addEventListener("click", downloadPacket);
  document.querySelector("#markReadyButton").addEventListener("click", markSelectedReady);

  elements.searchInput.addEventListener("input", event => {
    state.search = event.target.value.trim().toLowerCase();
    renderDisputeList();
  });
  elements.statusFilter.addEventListener("change", event => {
    state.status = event.target.value;
    renderDisputeList();
  });
  elements.reasonFilter.addEventListener("change", event => {
    state.reason = event.target.value;
    renderDisputeList();
  });
  elements.statusEditor.addEventListener("change", event => {
    updateSelected({ status: event.target.value });
  });
  elements.narrativeInput.addEventListener("input", event => {
    updateSelected({ narrative: event.target.value }, { silent: true });
  });
  elements.disputeForm.addEventListener("submit", createDispute);
}

function populateReasonControls() {
  Object.entries(reasonCatalog).forEach(([value, reason]) => {
    const filterOption = new Option(reason.label, value);
    const formOption = new Option(reason.label, value);
    elements.reasonFilter.append(filterOption);
    elements.reasonSelect.append(formOption);
  });
}

function render() {
  hydrateBusinessForm();
  renderLicenseGate();
  renderPricing();
  renderProfitPlaybook();
  renderMarketConfidence();
  renderResearch();
  renderLaunch();
  renderChannels();
  renderAdQuality();
  hydrateAutopilotForm();
  renderOperator();
  renderCostStack();
  renderRegistration();
  renderSystems();
  renderFeedback();
  renderPayments();
  renderIncomeEvidence();
  renderOperations();
  renderTopMonitor();
  renderCredentials();
  renderProfitOperator();
  renderMetrics();
  renderDisputeList();
  renderDetail();
  renderRoi();
  renderPlaybook();
  installTrackingTags();
  applyLicenseGate();
}

function renderLicenseGate() {
  const checkoutLink = getCoreCheckoutLink() || "#payments";
  const unlocked = hasProductAccess();
  const label = state.license.operatorLocal ? "local operator" : state.license.plan || "paid customer";
  elements.accessGate.classList.toggle("unlocked", unlocked);
  elements.accessGate.classList.toggle("locked", !unlocked);
  elements.licenseCheckoutLink.href = checkoutLink;
  elements.licenseCheckoutLink.textContent = checkoutLink === "#payments" ? "Add Core checkout link" : "Subscribe with Stripe";

  if (!elements.licenseForm.contains(document.activeElement)) {
    elements.licenseForm.elements.email.value = state.license.email || "";
    elements.licenseForm.elements.token.value = state.license.token || "";
  }

  elements.licenseStatus.innerHTML = `
    <strong>${unlocked ? `Access unlocked: ${escapeHtml(label)}` : "Paid access required"}</strong>
    <span>${escapeHtml(state.license.message || (unlocked ? "Workspace is available." : "Subscribe or verify a paid checkout before using the product workspace."))}</span>
    <span>${escapeHtml(getWorkspaceSyncText())}</span>
  `;
}

function getWorkspaceSyncText() {
  if (!hasProductAccess()) return "Customer records stay locked until paid access verifies.";
  if (state.license.operatorLocal) return "Local operator mode can save a server workspace for testing.";
  if (state.license.workspaceSyncedAt) return `Customer workspace synced ${formatDateTime(state.license.workspaceSyncedAt)}.`;
  return "Customer workspace will sync to encrypted server storage after verification.";
}

function applyLicenseGate() {
  const locked = !hasProductAccess();
  document.body.classList.toggle("license-locked", locked);
  ["newDisputeButton", "exportCsvButton", "seedButton", "clearButton", "copyPacketButton", "downloadPacketButton", "markReadyButton"].forEach(id => {
    const button = document.querySelector(`#${id}`);
    if (button) button.disabled = locked;
  });
  const csvInput = document.querySelector("#csvInput");
  if (csvInput) csvInput.disabled = locked;
  if (elements.statusEditor) elements.statusEditor.disabled = locked;
  if (elements.narrativeInput) elements.narrativeInput.disabled = locked;
}

async function verifyLicense(event) {
  event.preventDefault();
  const formData = new FormData(elements.licenseForm);
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("token") || "").trim();

  if (!email && !token && !isLocalOperatorHost()) {
    notify("Enter the paid checkout email and access token or session ID.");
    return;
  }

  try {
    const response = await fetch("/api/license/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token })
    });
    const payload = await response.json();
    updateLicenseState(payload, { email, token });
    persistLicense();
    if (payload.active) await syncCustomerWorkspace({ quiet: true });
    render();
    notify(payload.active ? "Workspace access verified and synced." : "Paid access was not verified.");
  } catch {
    if (isLocalOperatorHost()) {
      state.license = localOperatorLicense();
      persistLicense();
      await syncCustomerWorkspace({ quiet: true });
      render();
      notify("Local operator mode unlocked.");
      return;
    }
    notify("License verification is unavailable. Use the Stripe checkout link or retry when the server is online.");
  }
}

async function syncLicenseStatus(options = {}) {
  const params = new URLSearchParams();
  if (state.license.email) params.set("email", state.license.email);
  if (state.license.token) params.set("token", state.license.token);
  try {
    const response = await fetch(`/api/license/status${params.toString() ? `?${params}` : ""}`);
    if (!response.ok) throw new Error("License status failed");
    const payload = await response.json();
    updateLicenseState(payload, { email: state.license.email, token: state.license.token });
    persistLicense();
    if (payload.active && options.syncWorkspace !== false) await syncCustomerWorkspace({ quiet: true });
    render();
    if (!options.quiet) notify(payload.active ? "Access status confirmed." : "Paid access is still required.");
  } catch {
    if (isLocalOperatorHost()) {
      state.license = localOperatorLicense();
      persistLicense();
      render();
      if (!options.quiet) notify("Local operator mode unlocked.");
    } else if (!options.quiet) {
      notify("Access status could not be checked.");
    }
  }
}

function updateLicenseState(payload, submitted = {}) {
  state.license = {
    active: Boolean(payload.active),
    operatorLocal: Boolean(payload.operatorLocal),
    email: payload.customerEmail && payload.customerEmail !== "local-operator" ? payload.customerEmail : submitted.email || state.license.email || "",
    token: payload.active && !payload.operatorLocal ? submitted.token || state.license.token || "" : state.license.token || "",
    plan: payload.plan || state.license.plan || "",
    workspaceId: payload.account?.workspaceId || state.license.workspaceId || "",
    workspaceSyncedAt: payload.workspace?.updatedAt || state.license.workspaceSyncedAt || "",
    checkedAt: payload.checkedAt || new Date().toISOString(),
    message: payload.message || (payload.active ? "Paid access verified." : "Paid access required.")
  };
}

function hasProductAccess() {
  return Boolean(state.license?.active || state.license?.operatorLocal);
}

function getCoreCheckoutLink(settings = state.business) {
  const link = String(settings.coreLink || "").trim();
  if (!link || link === LEGACY_GROWTH_PAYMENT_LINK) return "";
  return link;
}

function ensureProductAccess(action) {
  if (hasProductAccess()) return true;
  notify(`Paid access required to ${action}.`);
  window.location.hash = "accessGate";
  renderLicenseGate();
  return false;
}

function hydrateBusinessForm() {
  Object.entries(state.business).forEach(([key, value]) => {
    const field = elements.businessForm.elements[key];
    if (!field || key === "completedSystems") return;
    field.value = value ?? "";
  });
}

function hydrateAutopilotForm() {
  Object.entries(state.business).forEach(([key, value]) => {
    const field = elements.autopilotForm.elements[key];
    if (!field || key === "completedSystems") return;
    field.value = value ?? "";
  });
}

function renderPricing() {
  elements.pricingGrid.innerHTML = pricingPlans.map(plan => {
    const link = state.business[plan.linkKey] || "#launch";
    const label = state.business[plan.linkKey] ? "Buy with Stripe" : "Add Core Stripe link";
    return `
      <article class="pricing-card ${plan.featured ? "featured" : ""}">
        <div>
          <p class="panel-label">${plan.featured ? "Recommended" : "Plan"}</p>
          <h4>${escapeHtml(plan.name)}</h4>
        </div>
        <div class="price-line">
          <strong>${formatMoney(plan.price)}</strong>
          <span>${escapeHtml(plan.cadence)}</span>
        </div>
        <p>${escapeHtml(plan.description)}</p>
        <ul class="feature-list">
          ${plan.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}
        </ul>
        <a class="button ${plan.featured ? "primary" : "secondary"} checkout-link" href="${escapeHtml(link)}" data-plan="${escapeHtml(plan.key)}">${label}</a>
      </article>
    `;
  }).join("");

  const preferred = getCoreCheckoutLink() || "#payments";
  elements.primaryCheckoutLink.href = preferred;
  elements.primaryCheckoutLink.textContent = preferred === "#payments" ? "Add Core checkout link" : "Start Core checkout";

  document.querySelectorAll(".checkout-link").forEach(link => {
    link.addEventListener("click", () => trackEvent("begin_checkout", { plan: link.dataset.plan || "primary" }));
  });
}

function renderProfitPlaybook() {
  elements.profitGrid.innerHTML = profitPlaybook.map(item => `
    <article class="profit-card">
      <p class="panel-label">Profit principle</p>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join("");
}

function renderMarketConfidence() {
  elements.marketConfidence.innerHTML = marketConfidence.map(item => `
    <article class="confidence-card">
      <p class="panel-label">${escapeHtml(item.signal)}</p>
      <strong>${escapeHtml(item.evidence)}</strong>
      <span>${escapeHtml(item.implication)}</span>
    </article>
  `).join("");
}

function renderResearch() {
  elements.researchGrid.innerHTML = marketResearch.map(item => `
    <article class="research-card">
      <p class="panel-label">Feature filter</p>
      <h4>${escapeHtml(item.feature)}</h4>
      <dl>
        <dt>Market need</dt>
        <dd>${escapeHtml(item.need)}</dd>
        <dt>Willingness to pay</dt>
        <dd>${escapeHtml(item.willingness)}</dd>
        <dt>Build decision</dt>
        <dd>${escapeHtml(item.decision)}</dd>
      </dl>
    </article>
  `).join("");
}

function renderLaunch() {
  const settings = getBusinessFormValues();
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const planPrice = Number(settings.planPrice || 0);
  const conversionRate = Number(settings.conversionRate || 1) / 100;
  const grossMargin = Number(settings.grossMargin || 1) / 100;
  const paidChannels = channelCatalog.filter(channel => channel.cpc > 0 && !channel.disabled);
  const paidShareTotal = paidChannels.reduce((sum, channel) => sum + channel.share, 0);
  const estimatedClicks = paidChannels.reduce((sum, channel) => {
    const weightedBudget = paidShareTotal > 0 ? monthlyBudget * (channel.share / paidShareTotal) : 0;
    return sum + weightedBudget / channel.cpc;
  }, 0);
  const paidCustomers = estimatedClicks * conversionRate;
  const monthlyGrossProfit = paidCustomers * planPrice * grossMargin;
  const breakEvenCac = planPrice * grossMargin;
  const blendedCac = paidCustomers > 0 ? monthlyBudget / paidCustomers : 0;
  const paybackMonths = monthlyGrossProfit > 0 ? monthlyBudget / monthlyGrossProfit : 0;

  const metrics = [
    ["Monthly budget", formatMoney(monthlyBudget)],
    ["Estimated clicks", Math.round(estimatedClicks)],
    ["Paid customers", paidCustomers.toFixed(1)],
    ["Break-even CAC", formatMoney(breakEvenCac)],
    ["Blended CAC", formatMoney(blendedCac)],
    ["Payback", paybackMonths ? `${paybackMonths.toFixed(1)} mo` : "No signal"]
  ];

  elements.launchMetrics.innerHTML = metrics.map(([label, value]) => `
    <div class="roi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");

  const verdict = monthlyBudget <= 25
    ? "Launch exactly one Reddit campaign: $5/day for 5 days. Headline: Chargeback evidence without revenue share. Body: self-serve, AI-assisted software for Stripe and Shopify merchants; $99/month, cancel anytime; no win guarantees; review outputs before use."
    : blendedCac > 0 && blendedCac <= breakEvenCac
      ? "This test can be strategically sound if the assumed conversion rate holds. Scale only after confirmed purchases, not lead volume alone."
      : "This budget is for signal, not scale. Improve conversion or price before raising spend if CAC lands above gross profit per first month.";
  elements.breakEvenNote.textContent = verdict;
}

function renderChannels() {
  const settings = getBusinessFormValues();
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const websiteUrl = settings.websiteUrl || "https://yourdomain.com";
  const activeChannels = monthlyBudget <= 25
    ? channelCatalog.filter(channel => channel.key === "reddit")
    : monthlyBudget < 300
      ? channelCatalog.filter(channel => ["google", "reddit", "meta", "direct", "linkedin"].includes(channel.key))
      : channelCatalog;
  const shareTotal = activeChannels.filter(channel => channel.cpc > 0 && !channel.disabled).reduce((sum, channel) => sum + channel.share, 0);

  elements.channelGrid.innerHTML = activeChannels.map(channel => {
    const budget = channel.cpc > 0 && !channel.disabled && shareTotal > 0 ? monthlyBudget * (channel.share / shareTotal) : 0;
    const isRedditValidation = monthlyBudget <= 25 && channel.key === "reddit" && budget > 0;
    const daily = isRedditValidation ? Math.min(5, budget) : budget / 30.4;
    const durationDays = isRedditValidation ? Math.max(1, Math.floor(budget / Math.max(daily, 1))) : 30;
    const budgetLabel = isRedditValidation ? `${formatMoney(budget)} test` : `${formatMoney(budget)}/mo`;
    const dailyLabel = isRedditValidation ? `${formatMoney(daily)}/day x ${durationDays}d` : `${formatMoney(daily)}/day`;
    const utm = buildUtmUrl(websiteUrl, channel);
    return `
      <article class="channel-card ${channel.disabled ? "disabled-channel" : ""}">
        <header>
          <div>
            <p class="panel-label">${escapeHtml(channel.barrier)} barrier</p>
            <h4>${escapeHtml(channel.name)}</h4>
          </div>
          <span class="channel-score">${escapeHtml(channel.score)}</span>
        </header>
        <p>${escapeHtml(channel.why)}</p>
        <div class="mini-row">
          <span class="status-chip">${escapeHtml(budgetLabel)}</span>
          <span class="status-chip">${escapeHtml(dailyLabel)}</span>
          <span class="status-chip">${channel.cpc > 0 ? `est. ${formatMoney(channel.cpc)} CPC` : "no paid spend"}</span>
        </div>
        <ul class="target-list">
          ${channel.targets.map(target => `<li>${escapeHtml(target)}</li>`).join("")}
        </ul>
        <div class="ad-copy-box">
          <strong>${escapeHtml(channel.headline)}</strong><br />
          ${escapeHtml(channel.body)}
        </div>
        <div class="utm-box">${escapeHtml(utm)}</div>
      </article>
    `;
  }).join("") + (monthlyBudget < 300 ? `
    <article class="channel-card">
      <header>
        <div>
          <p class="panel-label">Cost guardrail</p>
          <h4>${monthlyBudget <= 25 ? "Reddit-only validation" : "Skip broad scaling for now"}</h4>
        </div>
        <span class="channel-score">Lean mode</span>
      </header>
      <p>${monthlyBudget <= 25 ? "A $25 test should buy signal, not growth. Run one Reddit promoted post at $5/day for 5 days and send every click to the one Core checkout or feedback path." : "Budgets under $300/month should stay on high-intent Google Search, Reddit, Meta retargeting, and direct outreach."}</p>
      <div class="ad-copy-box"><strong>Operator action</strong><br />Do not raise spend until at least one paid checkout or three self-serve feedback submissions appear.</div>
    </article>
  ` : "");
}

function renderAdQuality() {
  elements.adQualityGrid.innerHTML = `
    <article class="ad-quality-card standards-card">
      <p class="panel-label">Paid spend standards</p>
      <h4>Review before money moves</h4>
      <ul class="target-list">
        ${adQualityStandards.map(item => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.standard)}</li>`).join("")}
      </ul>
    </article>
    ${adCreativeLibrary.map(item => `
      <article class="ad-quality-card">
        <p class="panel-label">${escapeHtml(item.channel)}</p>
        <h4>${escapeHtml(item.angle)}</h4>
        <div class="ad-copy-box">
          ${item.headlines.map(headline => `<strong>${escapeHtml(headline)}</strong>`).join("<br />")}
          <br />${escapeHtml(item.description)}
        </div>
        <div>
          <p class="panel-label">Targets</p>
          <ul class="target-list">${item.keywords.map(keyword => `<li>${escapeHtml(keyword)}</li>`).join("")}</ul>
        </div>
        <div>
          <p class="panel-label">Exclusions</p>
          <ul class="target-list">${item.negatives.map(keyword => `<li>${escapeHtml(keyword)}</li>`).join("")}</ul>
        </div>
      </article>
    `).join("")}
  `;
}

function renderOperator() {
  const settings = getMergedBusinessValues();
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const cardCap = Number(settings.fundingMonthlyCap || 0);
  const dailyAdCap = Number(settings.dailyAdCap || 0);
  const maxCac = Number(settings.maxCac || 0);
  const planPrice = Number(settings.planPrice || 0);
  const grossMargin = Number(settings.grossMargin || 0) / 100;
  const firstMonthGrossProfit = planPrice * grossMargin;
  const spendOk = monthlyBudget <= cardCap && dailyAdCap * 30.4 <= cardCap && maxCac <= firstMonthGrossProfit;
  const missingBilling = [
    ["Stripe", Boolean(getCoreCheckoutLink(settings))],
    ["Google Ads", Boolean(settings.googleAdsCustomerId)],
    ["Meta Ads", Boolean(settings.metaAdAccountId && settings.metaBusinessPortfolioId)],
    ["Reddit Ads", Boolean(settings.redditAdAccountId)],
    ["Direct outreach list", Boolean(settings.directOutreachList)]
  ];

  const items = [
    {
      label: spendOk ? "Ready" : "Needs review",
      title: "Spend guardrail",
      body: spendOk
        ? `Monthly budget and daily cap fit inside ${settings.fundingCardLabel || "the virtual card"} limits.`
        : "Card cap, daily ad cap, or max CAC does not yet fit the gross-profit guardrail."
    },
    {
      label: settings.autopilotMode,
      title: "Autopilot mode",
      body: getAutopilotModeDescription(settings.autopilotMode)
    },
    {
      label: "Billing setup",
      title: "Cards stay in provider vaults",
      body: missingBilling.map(([name, ready]) => `${name}: ${ready ? "connected/configured" : "needs setup"}`).join(" | ")
    },
    {
      label: "Payouts",
      title: settings.payoutBankLabel || "Stripe payout bank",
      body: `${settings.businessLegalName || "AR Trading"} should be linked inside Stripe as the payout destination. This app stores no bank credentials.`
    },
    {
      label: "Daily run",
      title: "Programmatic loop",
      body: "Check leads, ad spend, CAC, feedback, disputes, payout readiness, and income evidence; pause spend above cap; export release priorities weekly."
    }
  ];

  elements.operatorList.innerHTML = items.map(item => `
    <div class="operator-item">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
    </div>
  `).join("");
}

function getAutopilotModeDescription(mode) {
  if (mode === "draft") return "Software generates campaigns, UTMs, and budgets, but does not launch spend.";
  if (mode === "capped") return "After explicit approval and API setup, campaigns may run within card, daily, and CAC caps.";
  return "Software prepares actions and asks for approval before any spend-changing operation.";
}

function renderSystems() {
  elements.systemsGrid.innerHTML = systemsCatalog.map(system => {
    const checked = Boolean(state.business.completedSystems?.[system.key]);
    return `
      <label class="system-card">
        <input type="checkbox" data-system="${escapeHtml(system.key)}" ${checked ? "checked" : ""} />
        <span>
          <span class="system-topline">
            <strong>${escapeHtml(system.title)}</strong>
            <em>${system.launchNow ? "Launch now" : "Later"}</em>
          </span>
          <span>${escapeHtml(system.description)}</span>
          <small>Owner: ${escapeHtml(system.owner)}</small>
        </span>
      </label>
    `;
  }).join("");

  elements.systemsGrid.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      state.business.completedSystems = {
        ...state.business.completedSystems,
        [input.dataset.system]: input.checked
      };
      persistBusiness();
      renderSystems();
      notify("System checklist updated.");
    });
  });
}

function renderCostStack() {
  const fixedMonthly = costStack.reduce((sum, item) => sum + (typeof item.monthly === "number" ? item.monthly : 0), 0);
  elements.costStack.innerHTML = `
    <article class="cost-summary">
      <p class="panel-label">Minimum operating cost</p>
      <strong>${formatMoney(fixedMonthly)}/mo fixed software cost</strong>
      <span>Before domain, payment processing fees, and whatever ad budget you deliberately approve.</span>
    </article>
    ${costStack.map(item => `
      <article class="cost-card">
        <div>
          <p class="panel-label">${typeof item.monthly === "number" ? formatMoney(item.monthly) + "/mo" : "Controlled"}</p>
          <h4>${escapeHtml(item.item)}</h4>
        </div>
        <strong>${escapeHtml(item.choice)}</strong>
        <p>${escapeHtml(item.reason)}</p>
      </article>
    `).join("")}
  `;
}

function renderRegistration() {
  elements.registrationGrid.innerHTML = registrationCatalog.map(item => {
    const checked = Boolean(state.business.completedSystems?.[item.key]);
    return `
      <label class="registration-card">
        <input type="checkbox" data-system="${escapeHtml(item.key)}" ${checked ? "checked" : ""} />
        <span>
          <span class="system-topline">
            <strong>${escapeHtml(item.title)}</strong>
            <em>${item.required ? "Required" : "Optional"}</em>
          </span>
          <span>${escapeHtml(item.description)}</span>
        </span>
      </label>
    `;
  }).join("");

  elements.registrationGrid.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      state.business.completedSystems = {
        ...state.business.completedSystems,
        [input.dataset.system]: input.checked
      };
      persistBusiness();
      renderRegistration();
      notify("Business launch registry updated.");
    });
  });
}

function renderFeedback() {
  if (elements.feedbackForm.elements.version && !elements.feedbackForm.elements.version.value) {
    elements.feedbackForm.elements.version.value = APP_VERSION;
  }

  const priorityScore = { high: 0, medium: 1, low: 2 };
  const items = [...state.feedback].sort((a, b) => {
    const priorityDelta = (priorityScore[a.priority] ?? 3) - (priorityScore[b.priority] ?? 3);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const visibleItems = items.filter(item => {
    const haystack = `${item.email} ${item.type} ${item.priority} ${item.version} ${item.message} ${getReleaseBucket(item)}`.toLowerCase();
    const searchMatch = state.feedbackFilters.search === "" || haystack.includes(state.feedbackFilters.search);
    const typeMatch = state.feedbackFilters.type === "all" || item.type === state.feedbackFilters.type;
    const priorityMatch = state.feedbackFilters.priority === "all" || item.priority === state.feedbackFilters.priority;
    return searchMatch && typeMatch && priorityMatch;
  });

  const bucketCounts = countBy(items, getReleaseBucket);
  const highCount = items.filter(item => item.priority === "high").length;
  const uniqueCustomers = new Set(items.map(item => item.email).filter(Boolean)).size;
  const topAsk = getTopAsk(items);
  elements.feedbackSummary.innerHTML = [
    ["Total feedback", items.length],
    ["Customers heard", uniqueCustomers],
    ["High priority", highCount],
    ["Top ask", topAsk],
    ["Next patch", bucketCounts.patch || 0],
    ["Next minor", bucketCounts.minor || 0]
  ].map(([label, value]) => `
    <div class="summary-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");

  if (items.length === 0) {
    elements.feedbackList.innerHTML = `
      <div class="feedback-item">
        <span>No feedback yet</span>
        <strong>Start with brand-led customer discovery</strong>
        <p>Use this section to capture objections, bugs, missing integrations, and pricing signals as soon as prospects react.</p>
      </div>
    `;
    return;
  }

  if (visibleItems.length === 0) {
    elements.feedbackList.innerHTML = `
      <div class="feedback-item">
        <span>No matching feedback</span>
        <strong>Try a wider filter</strong>
        <p>All feedback remains stored. Filters only change what is visible here.</p>
      </div>
    `;
    return;
  }

  elements.feedbackList.innerHTML = visibleItems.map(item => `
    <article class="feedback-item">
      <span>${escapeHtml(item.priority)} priority - ${escapeHtml(item.type.replace(/_/g, " "))}</span>
      <strong>${escapeHtml(item.email)} on v${escapeHtml(item.version)}</strong>
      <p>${escapeHtml(item.message)}</p>
      <small>${formatDate(item.createdAt.slice(0, 10))} - Release bucket: ${escapeHtml(getReleaseBucket(item))}</small>
    </article>
  `).join("");
}

function renderPayments() {
  const payments = [...state.payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const paid = payments.filter(payment => payment.paymentStatus === "paid");
  const livePaid = paid.filter(payment => payment.livemode === true);
  const gross = paid.reduce((sum, payment) => sum + Number(payment.amountTotal || 0), 0) / 100;
  const liveGross = livePaid.reduce((sum, payment) => sum + Number(payment.amountTotal || 0), 0) / 100;
  const customers = new Set(payments.map(payment => payment.customerEmail).filter(Boolean)).size;
  const lastPayment = payments[0]?.createdAt ? formatDate(payments[0].createdAt.slice(0, 10)) : "None";

  elements.paymentSummary.innerHTML = [
    ["Gross checkout revenue", formatMoney(gross)],
    ["Live gross revenue", formatMoney(liveGross)],
    ["Paid customers", paid.length],
    ["Live paid customers", livePaid.length],
    ["Unique emails", customers],
    ["Last payment", lastPayment]
  ].map(([label, value]) => `
    <div class="summary-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");

  elements.paymentList.innerHTML = payments.length === 0 ? `
    <div class="payment-item">
      <span>No payment events yet</span>
      <strong>Use Stripe Payment Links to accept cash</strong>
      <p>Once Stripe sends checkout.session.completed webhooks, paid customers appear here. Funds remain in Stripe and are paid out to your bank account by Stripe.</p>
    </div>
  ` : payments.map(payment => `
    <article class="payment-item">
      <span>${escapeHtml(payment.livemode === true ? "live" : "test/demo")} - ${escapeHtml(payment.paymentStatus || "unknown")} - ${escapeHtml((payment.currency || "usd").toUpperCase())}</span>
      <strong>${escapeHtml(payment.customerEmail || "No customer email")} - ${formatMoney(Number(payment.amountTotal || 0) / 100)}</strong>
      <p>Session ${escapeHtml(payment.checkoutSessionId || "unknown")} received ${escapeHtml(formatDate((payment.createdAt || "").slice(0, 10)))}.</p>
    </article>
  `).join("");

  const payoutLinked = Boolean(state.business.completedSystems?.stripeBank);
  const identityReady = Boolean(state.business.completedSystems?.stripeIdentity);
  const businessMatchReady = Boolean(state.business.completedSystems?.stripeBusinessMatch);
  const payoutSummary = `
    <article class="payment-item">
      <span>${payoutLinked && identityReady && businessMatchReady ? "payout ready" : "payout setup pending"}</span>
      <strong>${escapeHtml(state.business.payoutBankLabel || "Chase Business account - AR Trading")}</strong>
      <p>Incoming customer cash should settle through Stripe to the Chase Business account registered as ${escapeHtml(state.business.businessLegalName || "AR Trading")}. Link the bank only inside Stripe; DisputeDesk stores no routing numbers, account numbers, bank login details, or card data.</p>
    </article>
    <article class="payment-item">
      <span>stripe dashboard money trail</span>
      <strong>Where to see collected money</strong>
      <p>Use Stripe live mode. Payments shows successful charges, Balance shows pending and available funds, Payouts shows transfers to Chase, and Reports exports the accounting trail.</p>
      <div class="stripe-link-row">
        <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">Payments</a>
        <a href="https://dashboard.stripe.com/balance" target="_blank" rel="noreferrer">Balance</a>
        <a href="https://dashboard.stripe.com/payouts" target="_blank" rel="noreferrer">Payouts</a>
        <a href="https://dashboard.stripe.com/reporting" target="_blank" rel="noreferrer">Reports</a>
      </div>
    </article>
  `;

  elements.cashAccessList.innerHTML = payoutSummary + cashAccessChecklist.map(item => {
    const checked = Boolean(state.business.completedSystems?.[item.key]);
    return `
      <label class="cash-item">
        <input type="checkbox" data-system="${escapeHtml(item.key)}" ${checked ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </span>
      </label>
    `;
  }).join("");

  elements.cashAccessList.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      state.business.completedSystems = {
        ...state.business.completedSystems,
        [input.dataset.system]: input.checked
      };
      persistBusiness();
      renderPayments();
      notify("Cash access checklist updated.");
    });
  });
}

function renderTopMonitor() {
  const liveIncome = Boolean(state.incomeEvidence?.incomeProducing);
  const liveGross = state.incomeEvidence?.live?.grossCheckoutRevenue || 0;
  const testGross = state.incomeEvidence?.testOrDemo?.grossCheckoutRevenue || 0;
  const openActions = state.opsActions.filter(action => action.status !== "done");
  const highActions = openActions.filter(action => action.priority === "high");
  const checkoutReady = Boolean(getCoreCheckoutLink());
  const payoutReady = Boolean(state.business.completedSystems?.stripeBank && state.business.completedSystems?.stripeIdentity && state.business.completedSystems?.stripeBusinessMatch);

  const tiles = [
    ["Server", "Running", "Confirmed by local health checks"],
    ["Live income", liveIncome ? "Yes" : "No", `${formatMoney(liveGross)} live gross revenue`],
    ["Test/demo", formatMoney(testGross), "Does not count as real income"],
    ["Leads", state.leads.length, "Captured prospects"],
    ["Feedback", state.feedback.length, "Customer outcome signals"],
    ["Actions", openActions.length, `${highActions.length} high priority`],
    ["Checkout", checkoutReady ? "Configured" : "Missing", "Stripe Payment Links"],
    ["Access", hasProductAccess() ? state.license.operatorLocal ? "Operator" : "Paid" : "Locked", "Product use is gated by Stripe license"],
    ["Payouts", payoutReady ? "Ready" : "Pending", state.business.payoutBankLabel || "Stripe bank, identity, and business match"]
  ];

  elements.topMonitorGrid.innerHTML = tiles.map(([label, value, note]) => `
    <article class="monitor-card ${label === "Live income" && liveIncome ? "good" : label === "Live income" ? "warn" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `).join("");

  elements.topMonitorNote.textContent = liveIncome
    ? "Live Stripe income evidence exists. Continue monitoring payout readiness, refunds, support, and feedback."
    : "No live income evidence yet. The business is running, but it needs live Stripe Payment Links, Stripe payout readiness to Chase, and a real paid checkout event.";
}

function renderCredentials() {
  const status = state.serverStatus || {};
  const environment = status.environment || {};
  const stripe = status.stripe || {};
  const settings = state.business || {};
  const backendUrl = settings.backendUrl || environment.backendUrl || "";
  const publicSiteUrl = settings.websiteUrl || environment.publicSiteUrl || "";
  const deployUrl = settings.deployToRenderUrl || DEPLOY_TO_RENDER_URL;
  const backendRepoUrl = settings.backendRepoUrl || BACKEND_REPO_URL;
  const webhookUrl = backendUrl ? `${backendUrl.replace(/\/$/, "")}/api/stripe/webhook` : "";
  const payoutReady = Boolean(settings.completedSystems?.stripeBank && settings.completedSystems?.stripeIdentity && settings.completedSystems?.stripeBusinessMatch);
  const redditReady = Boolean(settings.redditAdAccountId || status.providerAccounts?.redditAdAccountId);
  const metaReady = Boolean(settings.metaPixelId || settings.metaAdAccountId || settings.metaBusinessPortfolioId);
  const coreCheckoutLink = getCoreCheckoutLink(settings);

  elements.deploymentStrip.innerHTML = `
    <div>
      <span>Next required action</span>
      <strong>${backendUrl ? "Backend URL registered" : "Deploy public backend"}</strong>
      <p>${backendUrl ? `Backend: ${escapeHtml(backendUrl)}` : "Use the private GitHub repo and Render Blueprint, then paste the backend URL in Launch. Do not run paid ads until webhook, lookup key, and payout readiness are complete."}</p>
    </div>
    <div class="deployment-actions">
      <a href="${escapeHtml(deployUrl)}" target="_blank" rel="noreferrer">Deploy on Render</a>
      <a href="${escapeHtml(backendRepoUrl)}" target="_blank" rel="noreferrer">Backend repo</a>
      ${backendUrl ? `<a href="${escapeHtml(`${backendUrl.replace(/\/$/, "")}/health`)}" target="_blank" rel="noreferrer">Health check</a>` : ""}
    </div>
  `;

  const items = [
    {
      title: "Local operator secrets",
      status: environment.adminTokenConfigured && environment.licenseSecretConfigured && environment.storageEncryptionConfigured ? "ready" : "missing",
      credential: "ADMIN_TOKEN, LICENSE_SECRET, DATA_ENCRYPTION_KEY",
      action: "Run ./setup-credentials.command once. Server JSONL records are encrypted at rest with DATA_ENCRYPTION_KEY; do not put card, bank, or identity data in .env.",
      link: ""
    },
    {
      title: "Public storefront",
      status: publicSiteUrl ? "ready" : "missing",
      credential: "PUBLIC_SITE_URL",
      action: publicSiteUrl ? publicSiteUrl : "Use the GitHub Pages DisputeDesk URL or a domain you control.",
      link: publicSiteUrl
    },
    {
      title: "Public backend host",
      status: backendUrl ? "ready" : "missing",
      credential: "BACKEND_URL",
      action: backendUrl
        ? backendUrl
        : "Deploy the private backend repo on Render, set the host secrets there, then paste the public backend URL in Launch.",
      link: backendUrl || deployUrl
    },
    {
      title: "Stripe checkout",
      status: stripe.paymentLinksReady || coreCheckoutLink ? "ready" : "missing",
      credential: "Core $99/month Payment Link",
      action: coreCheckoutLink || "Create one live DisputeDesk Core Payment Link at $99/month, cancel anytime, then paste the URL in Launch.",
      link: coreCheckoutLink || "https://dashboard.stripe.com/payment-links"
    },
    {
      title: "Stripe webhook",
      status: backendUrl && environment.stripeWebhookSecretConfigured ? "ready" : "missing",
      credential: "STRIPE_WEBHOOK_SECRET",
      action: backendUrl
        ? `In Stripe Developers > Webhooks, add ${webhookUrl}, select checkout.session.completed, then set the signing secret on the backend host.`
        : "Deploy the public backend first. GitHub Pages cannot receive /api/stripe/webhook events.",
      link: "https://dashboard.stripe.com/webhooks"
    },
    {
      title: "Stripe checkout lookup",
      status: environment.stripeSecretKeyConfigured ? "ready" : "missing",
      credential: "STRIPE_SECRET_KEY or restricted server key",
      action: "Set this only on the backend host. It lets paid customers verify access from Stripe if webhook storage is reset on a free host.",
      link: "https://dashboard.stripe.com/apikeys"
    },
    {
      title: "Server data encryption",
      status: environment.storageEncryptionConfigured ? "ready" : "missing",
      credential: "AES-256-GCM record encryption",
      action: environment.storageEncryptionConfigured
        ? "Server-side leads, feedback, customer payment records, Stripe events, and operator logs are written as encrypted JSONL records."
        : "Set DATA_ENCRYPTION_KEY locally and on the backend host before collecting real leads, feedback, customer records, or Stripe events.",
      link: ""
    },
    {
      title: "Stripe payouts to Chase",
      status: payoutReady ? "ready" : "missing",
      credential: "No bank numbers stored here",
      action: "Inside Stripe only: link the Chase Business account for AR Trading and finish identity, tax, and business-name verification. Then mark the payout checklist complete.",
      link: "https://dashboard.stripe.com/settings/payouts"
    },
    {
      title: "Reddit Ads validation",
      status: redditReady ? "ready" : "missing",
      credential: "REDDIT_AD_ACCOUNT_ID",
      action: "Create Reddit Ads, add the capped virtual card inside Reddit billing, set $5/day for 5 days, then paste the ad account ID.",
      link: "https://ads.reddit.com"
    },
    {
      title: "Meta retargeting",
      status: metaReady ? "ready" : "later",
      credential: "Meta business ID, ad account ID, pixel ID",
      action: "Create Meta Business assets after Stripe payout/webhook readiness. Keep spend at $0 until Reddit validates buying intent.",
      link: "https://business.facebook.com"
    },
    {
      title: "Support inbox",
      status: settings.businessEmail ? "ready" : "missing",
      credential: "Support email",
      action: settings.businessEmail || "Use the dedicated support inbox for receipts, access issues, and feedback only.",
      link: settings.businessEmail ? `mailto:${settings.businessEmail}` : ""
    }
  ];

  const readyCount = items.filter(item => item.status === "ready").length;
  const requiredMissing = items.filter(item => item.status === "missing").length;
  elements.credentialNote.innerHTML = `
    <strong>${readyCount}/${items.length} account setup items ready</strong>
    <span>${requiredMissing} required item(s) still need account-owner action. Keep card numbers, bank details, SSNs, passwords, and recovery codes inside provider dashboards only.</span>
  `;
  elements.credentialGrid.innerHTML = items.map(item => `
    <article class="credential-card ${escapeHtml(item.status)}">
      <span>${escapeHtml(item.status === "ready" ? "ready" : item.status === "later" ? "later" : "needed")}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.credential)}</small>
      <p>${escapeHtml(item.action)}</p>
      ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">Open</a>` : ""}
    </article>
  `).join("");
}

function renderProfitOperator() {
  const report = state.profitReport || buildLocalProfitReport();
  const action = report.nextAction || {};
  const blockers = report.blockers || [];
  const economics = report.economics || {};
  const evidence = report.currentEvidence || {};
  const priority = String(action.priority || "medium").toLowerCase();
  const sourceLabel = state.profitReport ? "server report" : "local estimate";
  const checkedAt = report.checkedAt ? new Date(report.checkedAt).toLocaleString() : "Not checked yet";

  elements.profitAction.innerHTML = `
    <div class="profit-meta">
      <span class="status-chip ${escapeHtml(priority)}">${escapeHtml(priority)} priority</span>
      <span class="status-chip">${escapeHtml(action.area || "growth")}</span>
      <span class="status-chip">${escapeHtml(sourceLabel)}</span>
    </div>
    <h4>${escapeHtml(action.title || "Run the next profitable launch step")}</h4>
    <p>${escapeHtml(action.body || "Refresh the report to calculate the highest-leverage action from payment, payout, fulfillment, and acquisition status.")}</p>
    <div class="profit-blocker-list">
      ${(blockers.length ? blockers.slice(0, 5) : [{
        priority: "medium",
        area: "growth",
        title: "Ready for capped validation",
        body: "Keep spend at $25 or less until live checkout evidence proves buying intent."
      }]).map(item => `
        <article class="profit-blocker ${escapeHtml(item.priority || "medium")}">
          <span>${escapeHtml(item.priority || "medium")} - ${escapeHtml(item.area || "ops")}</span>
          <strong>${escapeHtml(item.title || "Action")}</strong>
          <p>${escapeHtml(item.body || "")}</p>
        </article>
      `).join("")}
    </div>
    <small>Last checked: ${escapeHtml(checkedAt)}</small>
  `;

  const rows = [
    ["Plan price", formatMoney(economics.corePriceMonthlyUsd || economics.growthPriceMonthlyUsd || state.business.planPrice || CORE_PLAN_PRICE)],
    ["First-month gross profit/customer", formatMoney(economics.firstMonthGrossProfitPerCustomerUsd || (Number(state.business.planPrice || CORE_PLAN_PRICE) * Number(state.business.grossMargin || 88) / 100))],
    ["Validation budget", formatMoney(economics.validationBudgetUsd || state.business.monthlyBudget || 25)],
    ["Daily ad cap", formatMoney(economics.dailyAdCapUsd || state.business.dailyAdCap || 5)],
    ["Break-even CAC", formatMoney(economics.breakEvenCacUsd || (Number(state.business.planPrice || CORE_PLAN_PRICE) * Number(state.business.grossMargin || 88) / 100))],
    ["One-customer $25 test return", formatMoney(economics.oneCustomerReturnOn25DollarTest || 0)],
    ["Live revenue", formatMoney(evidence.liveRevenueUsd || 0)],
    ["Live customers", evidence.liveCustomers || 0],
    ["Leads", evidence.leads || state.leads.length],
    ["Feedback", evidence.feedback || state.feedback.length],
    ["Paid access gate", evidence.paidAccessGate ? "On" : "Check"],
    ["Payout ready", evidence.payoutReady ? "Yes" : "No"]
  ];

  elements.profitEconomics.innerHTML = `
    <div class="profit-report-grid">
      ${rows.map(([label, value]) => `
        <div class="profit-report-tile">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `).join("")}
    </div>
    <div class="profit-rule">
      <strong>Operating rule</strong>
      <p>${escapeHtml(report.profitableOperatingRule || "Do not increase spend until live customer gross profit or clear self-serve buying intent justifies it.")}</p>
    </div>
  `;
}

function buildLocalProfitReport() {
  const status = state.serverStatus || {};
  const evidence = state.incomeEvidence || {};
  const price = Number(state.business.planPrice || CORE_PLAN_PRICE);
  const grossMargin = Number(state.business.grossMargin || 88) / 100;
  const validationBudget = Number(state.business.monthlyBudget || 25);
  const firstMonthGrossProfit = price * grossMargin;
  const backendReady = Boolean(state.business.backendUrl || status.environment?.backendUrl);
  const encryptionReady = Boolean(status.environment?.storageEncryptionConfigured);
  const webhookReady = Boolean(status.environment?.stripeWebhookSecretConfigured);
  const stripeLookupReady = Boolean(status.environment?.stripeSecretKeyConfigured);
  const payoutReady = Boolean(
    state.business.completedSystems?.stripeBank &&
    state.business.completedSystems?.stripeIdentity &&
    state.business.completedSystems?.stripeBusinessMatch
  );
  const redditReady = Boolean(state.business.redditAdAccountId || status.providerAccounts?.redditAdAccountId);
  const paymentReady = Boolean(getCoreCheckoutLink());
  const blockers = [];

  if (!backendReady) blockers.push(localProfitBlocker("fulfillment", "high", "Deploy public backend", "The storefront can sell on GitHub Pages, but paid access needs a public Node backend to receive Stripe webhooks."));
  if (!encryptionReady) blockers.push(localProfitBlocker("security", "high", "Set data encryption key", "Set DATA_ENCRYPTION_KEY locally and on the backend host before collecting leads, feedback, customer records, or Stripe events."));
  if (!webhookReady) blockers.push(localProfitBlocker("fulfillment", "high", "Connect Stripe webhook", "Add BACKEND_URL/api/stripe/webhook in Stripe and set the signing secret on the backend host."));
  if (!stripeLookupReady) blockers.push(localProfitBlocker("fulfillment", "high", "Set server-side Stripe checkout lookup key", "Set STRIPE_SECRET_KEY or a suitably restricted Stripe server key on the backend host so paid customers can verify access even if webhook storage is reset."));
  if (!payoutReady) blockers.push(localProfitBlocker("cash", "high", "Finish Stripe payout readiness", "Link the Chase Business account for AR Trading inside Stripe and complete identity, tax, and business-name checks."));
  if (!redditReady) blockers.push(localProfitBlocker("acquisition", "medium", "Create Reddit Ads account with capped billing", "Use the capped virtual card in Reddit Ads and keep validation at $5/day for 5 days."));
  if (!evidence.incomeProducing && paymentReady && blockers.length === 0) blockers.push(localProfitBlocker("proof", "medium", "Wait for live paid checkout evidence", "A live Stripe paid event must reach the webhook before this counts as income-producing."));

  return {
    checkedAt: new Date().toISOString(),
    profitableOperatingRule: "Do not increase spend until the first month gross profit from confirmed live customers exceeds acquisition spend or there is clear self-serve buying intent.",
    economics: {
      corePriceMonthlyUsd: price,
      assumedGrossMargin: grossMargin,
      firstMonthGrossProfitPerCustomerUsd: Math.round(firstMonthGrossProfit * 100) / 100,
      validationBudgetUsd: validationBudget,
      dailyAdCapUsd: Number(state.business.dailyAdCap || 5),
      breakEvenCacUsd: Math.round(firstMonthGrossProfit * 100) / 100,
      oneCustomerReturnOn25DollarTest: Math.round((firstMonthGrossProfit - validationBudget) * 100) / 100,
      requiredPaidCustomersToCoverValidationBudget: Math.ceil(validationBudget / Math.max(firstMonthGrossProfit, 1)),
      requiredConversionAtBudget: `${((validationBudget / Math.max(firstMonthGrossProfit, 1)) * 100).toFixed(1)}%`
    },
    currentEvidence: {
      liveRevenueUsd: evidence.live?.grossCheckoutRevenue || 0,
      liveCustomers: evidence.live?.paidCustomerCount || 0,
      leads: state.leads.length,
      feedback: state.feedback.length,
      canAcceptPayments: paymentReady,
      paidAccessGate: true,
      payoutReady
    },
    nextAction: blockers[0] || localProfitBlocker("growth", "medium", "Run $25 Reddit validation", "Launch one Reddit campaign at $5/day for 5 days and stop unless it produces a live checkout or strong self-serve feedback."),
    blockers
  };
}

function localProfitBlocker(area, priority, title, body) {
  return { area, priority, title, body, owner: "operator" };
}

async function syncCredentialsStatus(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/status", { headers });
    if (!response.ok) throw new Error("Setup status failed");
    state.serverStatus = await response.json();
    renderCredentials();
    renderProfitOperator();
    if (!options.quiet) notify("Account setup status refreshed.");
  } catch {
    if (!options.quiet) notify("Account setup status unavailable.");
  }
}

async function syncProfitReport(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/profit-report", { headers });
    if (!response.ok) throw new Error("Profit report failed");
    state.profitReport = await response.json();
    renderProfitOperator();
    if (!options.quiet) notify("Profit report refreshed.");
  } catch {
    state.profitReport = buildLocalProfitReport();
    renderProfitOperator();
    if (!options.quiet) notify("Profit report calculated locally.");
  }
}

function renderIncomeEvidence() {
  const evidence = state.incomeEvidence || {};
  const live = evidence.live || {};
  const testOrDemo = evidence.testOrDemo || {};
  const incomeProducing = Boolean(evidence.incomeProducing);

  elements.incomeEvidence.innerHTML = `
    <div class="income-banner ${incomeProducing ? "income-live" : "income-empty"}">
      <strong>${incomeProducing ? "Live income evidence found" : "No live income evidence yet"}</strong>
      <span>${escapeHtml(evidence.evidenceStandard || "Waiting for live Stripe paid checkout events.")}</span>
    </div>
    <div class="payment-summary">
      ${[
        ["Live gross", formatMoney(live.grossCheckoutRevenue || 0)],
        ["Live paid customers", live.paidCustomerCount || 0],
        ["Test/demo gross", formatMoney(testOrDemo.grossCheckoutRevenue || 0)],
        ["Test/demo paid", testOrDemo.paidCustomerCount || 0]
      ].map(([label, value]) => `
        <div class="summary-tile">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `).join("")}
    </div>
    <div class="payment-list">
      ${(live.records || []).length === 0 ? `
        <div class="payment-item">
          <span>Evidence required</span>
          <strong>Live Stripe paid event needed</strong>
          <p>The venture is not producing confirmed income until Stripe sends a live checkout.session.completed event with payment_status=paid.</p>
        </div>
      ` : live.records.map(record => `
        <article class="payment-item">
          <span>live paid customer</span>
          <strong>${escapeHtml(record.customerEmail || "No email")} - ${formatMoney(Number(record.amountTotal || 0) / 100)}</strong>
          <p>Session ${escapeHtml(record.checkoutSessionId || "unknown")} from event ${escapeHtml(record.sourceEventId || "unknown")}.</p>
        </article>
      `).join("")}
    </div>
  `;
}

async function syncIncomeEvidence(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/income-evidence", { headers });
    if (!response.ok) throw new Error("Income sync failed");
    state.incomeEvidence = await response.json();
    persistIncomeEvidence();
    renderIncomeEvidence();
    renderOperations();
    renderTopMonitor();
    renderProfitOperator();
    if (!options.quiet) notify(state.incomeEvidence.incomeProducing ? "Live income evidence found." : "No live income evidence yet.");
  } catch {
    if (!options.quiet) notify("Income evidence sync unavailable in this deployment.");
  }
}

function renderOperations() {
  const openActions = state.opsActions.filter(action => action.status !== "done");
  const highActions = openActions.filter(action => action.priority === "high");
  const liveIncome = Boolean(state.incomeEvidence?.incomeProducing);
  const checkoutReady = Boolean(getCoreCheckoutLink());
  const payoutReady = Boolean(state.business.completedSystems?.stripeBank && state.business.completedSystems?.stripeIdentity && state.business.completedSystems?.stripeBusinessMatch);
  const spendSafe = Number(state.business.monthlyBudget || 0) <= Number(state.business.fundingMonthlyCap || 0);

  elements.opsSummary.innerHTML = [
    ["Leads", state.leads.length],
    ["Paid records", state.payments.length],
    ["Live income", liveIncome ? "Yes" : "No"],
    ["Feedback", state.feedback.length],
    ["Open actions", openActions.length],
    ["Checkout ready", checkoutReady ? "Yes" : "No"],
    ["Paid gate", "On"],
    ["Payout ready", payoutReady ? "Yes" : "No"],
    ["Spend safe", spendSafe ? "Yes" : "No"],
    ["High priority", highActions.length]
  ].map(([label, value]) => `
    <div class="summary-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");

  elements.operationNorms.innerHTML = businessOperationNorms.map(norm => `
    <article class="norm-card">
      <strong>${escapeHtml(norm.title)}</strong>
      <span>${escapeHtml(norm.description)}</span>
    </article>
  `).join("");

  const actions = openActions.length > 0 ? openActions : generateLocalOpsActions();
  elements.opsActionList.innerHTML = actions.map(action => `
    <article class="ops-action">
      <span>${escapeHtml(action.priority)} - ${escapeHtml(action.area)}</span>
      <strong>${escapeHtml(action.title)}</strong>
      <p>${escapeHtml(action.body)}</p>
      <small>${escapeHtml(formatDate((action.createdAt || new Date().toISOString()).slice(0, 10)))}</small>
    </article>
  `).join("");
}

function generateLocalOpsActions() {
  const now = new Date().toISOString();
  const actions = [];
  if (!getCoreCheckoutLink()) {
    actions.push(localOpsAction("checkout", "high", "Configure Core Stripe Payment Link", "A live $99/month Core checkout link is required before the webapp can sell itself.", now));
  }
  if (!(state.business.completedSystems?.stripeBank && state.business.completedSystems?.stripeIdentity && state.business.completedSystems?.stripeBusinessMatch)) {
    actions.push(localOpsAction("cash", "high", "Complete payout readiness", "Link the Chase Business account for AR Trading inside Stripe, then complete identity, tax, and business-name checks before relying on customer cash access.", now));
  }
  if (Number(state.business.monthlyBudget || 0) > Number(state.business.fundingMonthlyCap || 0)) {
    actions.push(localOpsAction("spend", "high", "Budget exceeds funding cap", "Reduce ad budget or raise the external virtual-card cap before running campaigns.", now));
  }
  if (state.leads.length > state.payments.length) {
    actions.push(localOpsAction("sales", "medium", "Automate unmatched-lead nurture", "Route unmatched leads to the self-serve Core checkout or feedback path. Do not sell calls, consulting, or custom setup.", now));
  }
  if (state.feedback.some(item => item.priority === "high")) {
    actions.push(localOpsAction("product", "medium", "Triage high-priority feedback", "Move high-priority customer feedback into a patch, minor, or pricing-test release bucket.", now));
  }
  actions.push(localOpsAction("compliance", "low", "Review marketable claims", "Keep ad copy, AI disclosure, terms, privacy, refund policy, and no-liability language aligned with the actual software.", now));
  return actions;
}

function localOpsAction(area, priority, title, body, createdAt) {
  return {
    id: `${area}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    area,
    priority,
    title,
    body,
    status: "open",
    createdAt
  };
}

async function runAutonomousOpsCycle() {
  const localActions = generateLocalOpsActions();
  try {
    const headers = { "Content-Type": "application/json" };
    const token = elements.feedbackAdminToken.value.trim();
    if (token) headers["x-admin-token"] = token;
    const response = await fetch("/api/operator/run", {
      method: "POST",
      headers,
      body: JSON.stringify({ settings: state.business })
    });
    if (!response.ok) throw new Error("Ops run unavailable");
    const payload = await response.json();
    state.opsActions = mergeActions(localActions, payload.run?.actions || [], state.opsActions);
    notify(`Ops cycle ran with ${payload.run?.actions?.length || 0} server actions.`);
  } catch {
    state.opsActions = mergeActions(localActions, state.opsActions);
    notify("Ops cycle ran locally.");
  }
  persistOpsActions();
  renderOperations();
  renderTopMonitor();
  await syncProfitReport({ quiet: true });
}

function mergeActions(...groups) {
  const merged = new Map();
  groups.flat().forEach(action => {
    if (!action?.id) return;
    merged.set(action.id, action);
  });
  return Array.from(merged.values()).sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    const delta = (priority[a.priority] ?? 3) - (priority[b.priority] ?? 3);
    if (delta !== 0) return delta;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

async function syncAllBusinessData() {
  await Promise.allSettled([
    syncBusinessRegister({ quiet: true }),
    syncServerLeads({ quiet: true }),
    syncServerFeedback({ quiet: true }),
    syncServerPayments({ quiet: true }),
    syncIncomeEvidence({ quiet: true }),
    syncLicenseStatus({ quiet: true }),
    syncCredentialsStatus({ quiet: true }),
    syncProfitReport({ quiet: true })
  ]);
  await runAutonomousOpsCycle();
  await syncProfitReport({ quiet: true });
  notify("Business data synced and ops cycle refreshed.");
}

async function checkSystemHealth(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const [healthResponse, statusResponse, incomeResponse] = await Promise.all([
      fetch("/health"),
      fetch("/api/status", { headers }),
      fetch("/api/income-evidence", { headers })
    ]);
    if (!healthResponse.ok || !statusResponse.ok || !incomeResponse.ok) throw new Error("Health check failed");
    const health = await healthResponse.json();
    const status = await statusResponse.json();
    const income = await incomeResponse.json();
    const payoutReady = Boolean(
      state.business.completedSystems?.stripeBank &&
      state.business.completedSystems?.stripeIdentity &&
      state.business.completedSystems?.stripeBusinessMatch
    );
    elements.systemHealth.innerHTML = [
      ["Server", health.ok ? "Running" : "Down"],
      ["Version", health.version || APP_VERSION],
      ["Live income", income.incomeProducing ? "Yes" : "No"],
      ["Live gross", formatMoney(income.live?.grossCheckoutRevenue || 0)],
      ["Stripe account", status.stripe?.accountConfigured ? "Configured" : "Missing"],
      ["Stripe products", status.stripe?.productCatalogReady ? `${status.stripe.productCount} ready` : "Missing"],
      ["Payment Links", status.stripe?.paymentLinksReady ? "Ready" : status.stripe?.paymentLinksPausedByReview ? "Paused by review" : "Missing"],
      ["Paid access gate", status.license?.gatingEnabled ? "On" : "Missing"],
      ["Live licenses", status.license?.liveLicenseCount || 0],
      ["Payout target", state.business.payoutBankLabel || "Chase Business account - AR Trading"],
      ["Payout ready", payoutReady ? "Yes" : "No"],
      ["Stripe webhook", status.environment?.stripeWebhookSecretConfigured ? "Secret set" : "Secret missing"],
      ["Actions", status.counts?.openActions || 0]
    ].map(([label, value]) => `
      <div class="summary-tile">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `).join("");
    if (!options.quiet) notify("System health checked.");
  } catch {
    elements.systemHealth.innerHTML = `
      <div class="payment-item">
        <span>health unavailable</span>
        <strong>Server status could not be verified</strong>
        <p>Confirm the local server is running at this URL, then retry.</p>
      </div>
    `;
    if (!options.quiet) notify("System health check failed.");
  }
}

async function syncServerPayments(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/customers", { headers });
    if (!response.ok) throw new Error("Payment sync failed");
    const payload = await response.json();
    state.payments = payload.customers || [];
    persistPayments();
    renderPayments();
    renderOperations();
    renderTopMonitor();
    renderProfitOperator();
    if (!options.quiet) notify(`Synced ${state.payments.length} payment records.`);
  } catch {
    if (!options.quiet) notify("Payment sync unavailable in this deployment.");
  }
}

async function syncServerLeads(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/leads", { headers });
    if (!response.ok) throw new Error("Lead sync failed");
    const payload = await response.json();
    state.leads = payload.leads || [];
    persistLeads();
    renderOperations();
    renderTopMonitor();
    renderProfitOperator();
    if (!options.quiet) notify(`Synced ${state.leads.length} lead records.`);
  } catch {
    if (!options.quiet) notify("Lead sync unavailable in this deployment.");
  }
}

async function submitFeedback(event) {
  event.preventDefault();
  const formData = new FormData(elements.feedbackForm);
  const feedback = {
    id: `fb_${Date.now().toString(36)}`,
    email: String(formData.get("email") || "").trim(),
    type: String(formData.get("type") || "missing_feature"),
    priority: String(formData.get("priority") || "medium"),
    version: String(formData.get("version") || APP_VERSION).trim(),
    message: String(formData.get("message") || "").trim(),
    createdAt: new Date().toISOString()
  };

  state.feedback.unshift(feedback);
  persistFeedback();
  renderFeedback();
  trackEvent("feedback_submitted", { type: feedback.type, priority: feedback.priority });

  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback)
    });
  } catch {
    // Static deployments keep feedback in local storage until exported.
  }

  elements.feedbackForm.reset();
  elements.feedbackForm.elements.version.value = APP_VERSION;
  notify("Feedback added to release loop.");
}

async function syncServerFeedback(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/feedback", { headers });
    if (!response.ok) throw new Error("Feedback sync failed");
    const payload = await response.json();
    const merged = new Map(state.feedback.map(item => [item.id || `${item.email}-${item.createdAt}`, item]));
    for (const item of payload.feedback || []) {
      merged.set(item.id || `${item.email}-${item.createdAt}`, item);
    }
    state.feedback = Array.from(merged.values());
    persistFeedback();
    renderFeedback();
    renderOperations();
    if (!options.quiet) notify(`Synced ${payload.feedback?.length || 0} server feedback records.`);
  } catch {
    if (!options.quiet) notify("Server feedback sync unavailable in this deployment.");
  }
}

function exportFeedback() {
  const headers = ["id", "email", "type", "priority", "version", "message", "createdAt", "releaseBucket"];
  const rows = state.feedback.map(item => headers.map(header => {
    const value = header === "releaseBucket" ? getReleaseBucket(item) : item[header];
    return csvCell(value);
  }).join(","));
  downloadFile(`disputedesk-feedback-${toDateInputValue(new Date())}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv");
}

function getReleaseBucket(item) {
  if (item.priority === "high" && ["bug", "confusing_workflow"].includes(item.type)) return "patch";
  if (item.priority === "high" || item.type === "missing_feature") return "minor";
  if (item.type === "pricing") return "pricing-test";
  if (item.type === "testimonial") return "marketing-proof";
  return "backlog";
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function mergeLeads(...groups) {
  const merged = new Map();
  groups.flat().forEach(lead => {
    if (!lead?.email) return;
    merged.set(`${lead.email}-${lead.createdAt || ""}`, lead);
  });
  return Array.from(merged.values());
}

function getTopAsk(items) {
  if (items.length === 0) return "None yet";
  const labels = {
    missing_feature: "Missing features",
    confusing_workflow: "Workflow confusion",
    bug: "Bugs",
    pricing: "Pricing",
    testimonial: "Positive proof"
  };
  const counts = countBy(items, item => item.type);
  const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return top ? `${labels[top[0]] || top[0]} (${top[1]})` : "None yet";
}

function updateBusinessPreview() {
  state.business = normalizeBusinessSettings({
    ...state.business,
    ...getMergedBusinessValues(),
    linkedinAdAccountId: "",
    linkedinPartnerId: "",
    linkedinConversionId: "",
    completedSystems: state.business.completedSystems || {}
  });
  renderPricing();
  renderLaunch();
  renderChannels();
  renderAdQuality();
  renderOperator();
  renderRegistration();
  renderPayments();
  renderSystems();
}

async function saveBusinessSettings(event) {
  event.preventDefault();
  state.business = normalizeBusinessSettings({
    ...state.business,
    ...getMergedBusinessValues(),
    linkedinAdAccountId: "",
    linkedinPartnerId: "",
    linkedinConversionId: "",
    completedSystems: state.business.completedSystems || {}
  });
  persistBusiness();
  await registerBusinessSettings();
  render();
  trackEvent("launch_settings_saved");
  notify("Launch settings saved and registered locally.");
}

async function saveOperatorRules(event) {
  event.preventDefault();
  state.business = normalizeBusinessSettings({
    ...state.business,
    ...getMergedBusinessValues(),
    completedSystems: state.business.completedSystems || {}
  });
  persistBusiness();
  await registerBusinessSettings({ quiet: true });
  render();
  trackEvent("operator_rules_saved", { mode: state.business.autopilotMode });
  notify("Operator rules saved.");
}

async function registerBusinessSettings(options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/business-register", {
      method: "POST",
      headers,
      body: JSON.stringify({ settings: state.business })
    });
    if (!response.ok) throw new Error("Business register unavailable");
    return await response.json();
  } catch {
    if (!options.quiet) notify("Saved in browser. Local business register sync is unavailable.");
    return null;
  }
}

async function syncBusinessRegister(options = {}) {
  const headers = {};
  const token = elements.feedbackAdminToken.value.trim();
  if (token) headers["x-admin-token"] = token;
  try {
    const response = await fetch("/api/business-register", { headers });
    if (!response.ok) throw new Error("Business register unavailable");
    const payload = await response.json();
    const mapped = businessSettingsFromRegister(payload.register || {});
    state.business = normalizeBusinessSettings({
      ...state.business,
      ...mapped,
      completedSystems: {
        ...(state.business.completedSystems || {}),
        ...(mapped.completedSystems || {})
      }
    });
    persistBusiness();
    render();
    if (!options.quiet) notify("Business register synced.");
  } catch {
    if (!options.quiet) notify("Business register sync unavailable.");
  }
}

function businessSettingsFromRegister(register) {
  return removeEmptyValues({
    websiteUrl: register.business?.publicSiteUrl,
    backendUrl: register.business?.backendUrl,
    businessEmail: register.business?.supportEmail,
    businessLegalName: register.business?.legalOrTradeName,
    payoutBankLabel: register.cashAccess?.bankAccountLabel,
    monthlyBudget: register.adSpend?.monthlyValidationBudget,
    dailyAdCap: register.adSpend?.dailyAdCap,
    fundingCardLabel: register.adSpend?.fundingCardLabel,
    planPrice: register.pricing?.coreMonthly,
    coreLink: register.checkout?.coreLink,
    googleAdsCustomerId: register.providerAccounts?.googleAdsCustomerId,
    metaAdAccountId: register.providerAccounts?.metaAdAccountId,
    metaBusinessPortfolioId: register.providerAccounts?.metaBusinessPortfolioId,
    redditAdAccountId: register.providerAccounts?.redditAdAccountId,
    backendRepoUrl: register.deployment?.backendRepo,
    deployToRenderUrl: register.deployment?.deployToRenderUrl,
    completedSystems: {
      stripeBank: Boolean(register.cashAccess?.stripeBankReady),
      stripeIdentity: Boolean(register.cashAccess?.stripeIdentityReady),
      stripeBusinessMatch: Boolean(register.cashAccess?.stripeBusinessMatchReady),
      paymentLinksLive: Boolean(register.checkout?.coreLink),
      websitePolicies: Boolean(register.compliance?.termsPublished && register.compliance?.privacyPublished && register.compliance?.refundPolicyPublished)
    }
  });
}

function removeEmptyValues(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) return Object.keys(entry).length > 0;
    return entry !== undefined && entry !== null && entry !== "";
  }));
}

function exportOperatorConfig() {
  const settings = getMergedBusinessValues();
  const config = {
    appVersion: APP_VERSION,
    generatedAt: new Date().toISOString(),
    mode: settings.autopilotMode,
    business: {
      legalOrTradeName: settings.businessLegalName,
      payoutBankLabel: settings.payoutBankLabel,
      bankDetailsStored: false,
      payoutRail: "Stripe payouts"
    },
    funding: {
      cardLabel: settings.fundingCardLabel,
      monthlyCap: Number(settings.fundingMonthlyCap || 0),
      dailyAdCap: Number(settings.dailyAdCap || 0),
      maxCac: Number(settings.maxCac || 0),
      rawCardDataStored: false
    },
    checkout: {
      mode: settings.stripeAccountMode,
      coreLink: settings.coreLink,
      plan: "DisputeDesk Core",
      monthlyUsd: Number(settings.planPrice || CORE_PLAN_PRICE),
      cancelAnytime: true
    },
    adAccounts: {
      googleAdsCustomerId: settings.googleAdsCustomerId,
      metaAdAccountId: settings.metaAdAccountId,
      metaBusinessPortfolioId: settings.metaBusinessPortfolioId,
      redditAdAccountId: settings.redditAdAccountId,
      directOutreachList: settings.directOutreachList
    },
    envSecretsRequiredOnServerOnly: [
      "STRIPE_WEBHOOK_SECRET",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "META_ACCESS_TOKEN",
      "REDDIT_ADS_ACCESS_TOKEN",
      "DIRECT_OUTREACH_CSV_OR_SHEET"
    ],
    liabilityNotice: "Do not store payment card numbers in this app. Use provider billing pages and official APIs. This business uses AI-assisted software built with Codex from OpenAI. Users accept AI software risks and must review outputs before use. Keep campaigns capped and review claims before publishing."
  };
  downloadFile(`disputedesk-operator-config-${toDateInputValue(new Date())}.json`, JSON.stringify(config, null, 2), "application/json");
}

function getBusinessFormValues() {
  const formData = new FormData(elements.businessForm);
  const requestedBudget = Number(formData.get("monthlyBudget") || state.business.monthlyBudget || 0);
  return {
    websiteUrl: String(formData.get("websiteUrl") || "").trim(),
    backendUrl: String(formData.get("backendUrl") || state.business.backendUrl || "").trim(),
    businessEmail: String(formData.get("businessEmail") || "").trim(),
    businessLegalName: String(formData.get("businessLegalName") || state.business.businessLegalName || "AR Trading").trim(),
    payoutBankLabel: String(formData.get("payoutBankLabel") || state.business.payoutBankLabel || "Chase Business account - AR Trading").trim(),
    monthlyBudget: Math.min(25, Math.max(0, requestedBudget)),
    planPrice: Number(formData.get("planPrice") || state.business.planPrice || 0),
    conversionRate: Number(formData.get("conversionRate") || state.business.conversionRate || 1),
    grossMargin: Number(formData.get("grossMargin") || state.business.grossMargin || 1),
    coreLink: String(formData.get("coreLink") || "").trim(),
    googleTagId: String(formData.get("googleTagId") || "").trim(),
    googleAdsSendTo: String(formData.get("googleAdsSendTo") || "").trim(),
    metaPixelId: String(formData.get("metaPixelId") || "").trim(),
    redditPixelId: String(formData.get("redditPixelId") || "").trim(),
    linkedinPartnerId: "",
    linkedinConversionId: ""
  };
}

function getOperatorFormValues() {
  const formData = new FormData(elements.autopilotForm);
  const requestedFundingCap = Number(formData.get("fundingMonthlyCap") || 0);
  const requestedDailyCap = Number(formData.get("dailyAdCap") || 0);
  return {
    fundingCardLabel: String(formData.get("fundingCardLabel") || "").trim(),
    fundingMonthlyCap: Math.min(25, Math.max(0, requestedFundingCap)),
    dailyAdCap: Math.min(5, Math.max(0, requestedDailyCap)),
    maxCac: Number(formData.get("maxCac") || 0),
    autopilotMode: String(formData.get("autopilotMode") || "approval"),
    stripeAccountMode: String(formData.get("stripeAccountMode") || "payment_links"),
    googleAdsCustomerId: String(formData.get("googleAdsCustomerId") || "").trim(),
    metaAdAccountId: String(formData.get("metaAdAccountId") || "").trim(),
    metaBusinessPortfolioId: String(formData.get("metaBusinessPortfolioId") || "").trim(),
    redditAdAccountId: String(formData.get("redditAdAccountId") || "").trim(),
    directOutreachList: String(formData.get("directOutreachList") || "").trim()
  };
}

function getMergedBusinessValues() {
  return {
    ...state.business,
    ...getBusinessFormValues(),
    ...getOperatorFormValues()
  };
}

async function submitLead(event) {
  event.preventDefault();
  const formData = new FormData(elements.leadForm);
  const payload = {
    email: String(formData.get("email") || "").trim(),
    company: String(formData.get("company") || "").trim(),
    source: new URLSearchParams(window.location.search).get("utm_source") || "direct",
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Lead endpoint unavailable");
    notify("Lead captured. Follow-up workflow ready.");
  } catch {
    const stored = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
    stored.push(payload);
    localStorage.setItem(LEADS_KEY, JSON.stringify(stored));
    notify("Lead saved locally for this demo.");
  }

  state.leads = mergeLeads(state.leads, [payload]);
  persistLeads();
  renderOperations();
  trackEvent("generate_lead", { source: payload.source });
  elements.leadForm.reset();
}

function renderMetrics() {
  const active = state.disputes.filter(dispute => !["won", "lost"].includes(dispute.status));
  const exposure = active.reduce((sum, dispute) => sum + Number(dispute.amount || 0), 0);
  const dueSoon = active.filter(dispute => daysUntil(dispute.dueDate) <= 4).length;
  const avgConfidence = average(active.map(getConfidence));
  const submitted = state.disputes.filter(dispute => dispute.status === "submitted").length;
  const won = state.disputes.filter(dispute => dispute.status === "won").length;
  const winRate = submitted + won === 0 ? 0 : Math.round((won / (submitted + won)) * 100);

  elements.sideRevenue.textContent = formatMoney(exposure);
  elements.sideConfidence.textContent = `${Math.round(avgConfidence)}%`;

  const metrics = [
    {
      label: "Active exposure",
      value: formatMoney(exposure),
      note: "Disputed value still recoverable",
      bars: active.map(dispute => dispute.amount)
    },
    {
      label: "Due in 4 days",
      value: dueSoon,
      note: "Needs evidence before the window closes",
      bars: active.map(dispute => Math.max(1, 8 - daysUntil(dispute.dueDate)))
    },
    {
      label: "Avg confidence",
      value: `${Math.round(avgConfidence)}%`,
      note: "Evidence quality across active packets",
      bars: active.map(getConfidence)
    },
    {
      label: "Observed win rate",
      value: `${winRate}%`,
      note: "Won against submitted and won records",
      bars: state.disputes.map(dispute => (dispute.status === "won" ? 100 : dispute.status === "lost" ? 20 : 55))
    }
  ];

  elements.metricGrid.innerHTML = metrics.map(metric => `
    <article class="metric-card">
      <p class="panel-label">${escapeHtml(metric.label)}</p>
      <strong>${escapeHtml(String(metric.value))}</strong>
      <small>${escapeHtml(metric.note)}</small>
      <div class="metric-chart" aria-hidden="true">${renderBars(metric.bars)}</div>
    </article>
  `).join("");
}

function renderBars(values) {
  const normalized = values.slice(0, 7);
  while (normalized.length < 7) normalized.push(0);
  const max = Math.max(...normalized, 1);
  return normalized.map(value => {
    const height = value <= 0 ? 12 : Math.max(14, Math.round((value / max) * 36));
    return `<span style="height:${height}px"></span>`;
  }).join("");
}

function renderDisputeList() {
  if (!hasProductAccess()) {
    elements.queueCount.textContent = "locked";
    elements.disputeList.innerHTML = `
      <div class="queue-card locked-card">
        <h4>Paid access required</h4>
        <div class="queue-card-meta">Subscribe or verify access to use the dispute workspace.</div>
      </div>
    `;
    return;
  }

  const disputes = getFilteredDisputes();
  elements.queueCount.textContent = disputes.length;

  if (disputes.length === 0) {
    elements.disputeList.innerHTML = `<div class="queue-card"><h4>No matching disputes</h4><div class="queue-card-meta">Adjust filters or create a packet.</div></div>`;
    return;
  }

  elements.disputeList.innerHTML = disputes.map(dispute => {
    const confidence = getConfidence(dispute);
    const days = daysUntil(dispute.dueDate);
    return `
      <button class="queue-card ${dispute.id === state.selectedId ? "active" : ""}" type="button" data-id="${escapeHtml(dispute.id)}">
        <div class="queue-card-header">
          <div>
            <h4>${escapeHtml(dispute.customer)}</h4>
            <div class="queue-card-meta">
              <span>${escapeHtml(dispute.id)}</span>
              <span>${escapeHtml(dispute.orderId)}</span>
            </div>
          </div>
          <span class="money">${formatMoney(dispute.amount)}</span>
        </div>
        <div class="queue-card-meta">
          <span class="reason-chip">${escapeHtml(getReason(dispute).label)}</span>
          <span class="status-chip">${escapeHtml(statusLabels[dispute.status] || dispute.status)}</span>
          <span class="deadline ${deadlineClass(days)}">${formatDays(days)}</span>
          <span>${confidence}% ready</span>
        </div>
      </button>
    `;
  }).join("");

  elements.disputeList.querySelectorAll(".queue-card[data-id]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      renderDisputeList();
      renderDetail();
    });
  });
}

function renderDetail() {
  if (!hasProductAccess()) {
    elements.detailEmpty.hidden = false;
    elements.detailContent.hidden = true;
    elements.detailEmpty.innerHTML = `
      <p class="panel-label">Evidence builder</p>
      <h3>Workspace locked</h3>
      <p>Paid users can build, import, copy, and download dispute packets after Stripe license verification.</p>
    `;
    return;
  }

  const dispute = getSelected();

  if (!dispute) {
    elements.detailEmpty.hidden = false;
    elements.detailContent.hidden = true;
    elements.detailEmpty.innerHTML = `
      <p class="panel-label">Evidence builder</p>
      <h3>Select a dispute</h3>
      <p>Packets appear here once a dispute is selected.</p>
    `;
    return;
  }

  const confidence = getConfidence(dispute);
  const reason = getReason(dispute);
  elements.detailEmpty.hidden = true;
  elements.detailContent.hidden = false;
  elements.detailProcessor.textContent = dispute.processor;
  elements.detailName.textContent = `${dispute.customer} - ${formatMoney(dispute.amount)}`;
  elements.statusEditor.value = dispute.status;
  elements.confidenceText.textContent = `${confidence}%`;
  elements.confidenceBar.style.width = `${confidence}%`;
  elements.narrativeInput.value = dispute.narrative || buildNarrative(dispute);
  renderCustomerFit(dispute);

  elements.detailSummary.innerHTML = [
    ["Reason", reason.label],
    ["Due", `${formatDate(dispute.dueDate)} (${formatDays(daysUntil(dispute.dueDate))})`],
    ["Order", dispute.orderId],
    ["Email", dispute.email]
  ].map(([label, value]) => `
    <div class="summary-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  elements.evidenceChecklist.innerHTML = reason.checklist.map(([key, title, help]) => `
    <label class="check-item">
      <input type="checkbox" data-evidence="${escapeHtml(key)}" ${dispute.evidence.includes(key) ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(help)}</span>
      </span>
    </label>
  `).join("");

  elements.evidenceChecklist.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      const nextEvidence = new Set(dispute.evidence);
      if (input.checked) {
        nextEvidence.add(input.dataset.evidence);
      } else {
        nextEvidence.delete(input.dataset.evidence);
      }
      updateSelected({ evidence: Array.from(nextEvidence) });
    });
  });
}

function renderCustomerFit(dispute) {
  const reason = getReason(dispute);
  const missing = getMissingEvidence(dispute);
  const completed = getCompletedEvidence(dispute);
  const guide = getProcessorGuide(dispute.processor);
  const days = daysUntil(dispute.dueDate);
  const confidence = getConfidence(dispute);
  const qaChecks = getPacketQaChecks(dispute);
  const nextActions = getNextBestActions(dispute);

  const fitTiles = [
    {
      label: "Merchant job",
      value: "Answer the claim",
      body: reason.focus,
      tone: "good"
    },
    {
      label: "Deadline",
      value: days < 0 ? "Missed" : formatDays(days),
      body: days < 0
        ? "Do not promise recovery. Record the missed deadline and decide whether any external remedy is worth pursuing."
        : days <= 2
          ? "High urgency: finish evidence review before doing anything else."
          : "Deadline is still open. Prioritize missing evidence before editing style.",
      tone: days < 0 || days <= 2 ? "warn" : "good"
    },
    {
      label: "Evidence gaps",
      value: missing.length === 0 ? "Complete" : `${missing.length} missing`,
      body: missing.length === 0
        ? `${completed.length} reason-specific evidence items are checked.`
        : `Next missing item: ${missing[0][1]}.`,
      tone: missing.length === 0 ? "good" : "warn"
    },
    {
      label: "Submit in",
      value: guide.label,
      body: guide.destination,
      tone: confidence >= 80 ? "good" : "neutral"
    }
  ];

  elements.customerFitGrid.innerHTML = fitTiles.map(tile => `
    <article class="fit-card ${tile.tone}">
      <span>${escapeHtml(tile.label)}</span>
      <strong>${escapeHtml(tile.value)}</strong>
      <p>${escapeHtml(tile.body)}</p>
    </article>
  `).join("");

  elements.packetQa.innerHTML = `
    <div class="packet-qa-header">
      <div>
        <p class="panel-label">Packet QA</p>
        <h4>Will this help a paying merchant?</h4>
      </div>
      <span class="status-chip">${qaChecks.filter(item => item.ok).length}/${qaChecks.length} checks</span>
    </div>
    <div class="qa-grid">
      ${qaChecks.map(item => `
        <article class="qa-item ${item.ok ? "pass" : "needs-work"}">
          <strong>${item.ok ? "Pass" : "Fix"} - ${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `).join("")}
    </div>
    <div class="next-action-strip">
      ${nextActions.map(action => `<span>${escapeHtml(action)}</span>`).join("")}
    </div>
    <div class="processor-guide">
      <strong>${escapeHtml(guide.label)} submission steps</strong>
      <ol>
        ${guide.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
    </div>
  `;
}

function renderRoi() {
  const active = state.disputes.filter(dispute => !["won", "lost"].includes(dispute.status));
  const exposure = active.reduce((sum, dispute) => sum + Number(dispute.amount || 0), 0);
  const expectedRecovery = active.reduce((sum, dispute) => sum + Number(dispute.amount || 0) * (getConfidence(dispute) / 100), 0);
  const successFeeAt25 = expectedRecovery * 0.25;
  const softwarePlan = active.length === 0 ? 0 : Number(state.business.planPrice || CORE_PLAN_PRICE);
  const netAdvantage = Math.max(0, successFeeAt25 - softwarePlan);

  const values = [
    ["Expected recovery", formatMoney(expectedRecovery)],
    ["25% success fee", formatMoney(successFeeAt25)],
    ["Fixed software plan", formatMoney(softwarePlan)],
    ["Customer savings", formatMoney(netAdvantage)],
    ["Average case size", formatMoney(active.length ? exposure / active.length : 0)],
    ["Records watched", active.length]
  ];

  elements.roiGrid.innerHTML = values.map(([label, value]) => `
    <div class="roi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

function renderPlaybook() {
  const active = state.disputes
    .filter(dispute => !["won", "lost"].includes(dispute.status))
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  const tasks = active.slice(0, 4).map(dispute => {
    const missing = getMissingEvidence(dispute);
    const action = missing.length > 0
      ? `Collect ${missing[0][1].toLowerCase()} for ${dispute.orderId}.`
      : `Submit the packet for ${dispute.orderId}.`;
    return {
      label: formatDays(daysUntil(dispute.dueDate)),
      title: dispute.customer,
      body: action
    };
  });

  if (tasks.length === 0) {
    tasks.push({
      label: "Quiet queue",
      title: "No open disputes",
      body: "Import new records or keep the sample queue as a demo workflow."
    });
  }

  elements.playbookList.innerHTML = tasks.map(task => `
    <div class="playbook-item">
      <span>${escapeHtml(task.label)}</span>
      <strong>${escapeHtml(task.title)}</strong>
      <p>${escapeHtml(task.body)}</p>
    </div>
  `).join("");
}

function getFilteredDisputes() {
  return state.disputes
    .filter(dispute => {
      const haystack = `${dispute.id} ${dispute.orderId} ${dispute.customer} ${dispute.email} ${dispute.product}`.toLowerCase();
      const searchMatch = state.search === "" || haystack.includes(state.search);
      const statusMatch = state.status === "all" || dispute.status === state.status;
      const reasonMatch = state.reason === "all" || dispute.reason === state.reason;
      return searchMatch && statusMatch && reasonMatch;
    })
    .sort((a, b) => {
      const dayDelta = daysUntil(a.dueDate) - daysUntil(b.dueDate);
      if (dayDelta !== 0) return dayDelta;
      return getConfidence(a) - getConfidence(b);
    });
}

function getSelected() {
  return state.disputes.find(dispute => dispute.id === state.selectedId) || null;
}

function updateSelected(patch, options = {}) {
  if (!ensureProductAccess("edit a dispute packet")) return;
  const dispute = getSelected();
  if (!dispute) return;
  Object.assign(dispute, patch);
  persist();
  render();
  if (!options.silent) notify("Packet updated.");
}

function markSelectedReady() {
  if (!ensureProductAccess("mark a packet ready")) return;
  const dispute = getSelected();
  if (!dispute) return;
  const completeEvidence = getReason(dispute).checklist.map(item => item[0]);
  updateSelected({ evidence: completeEvidence, status: "ready" });
}

function openDialog() {
  if (!ensureProductAccess("create a dispute packet")) return;
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + 7);
  elements.disputeForm.reset();
  elements.disputeForm.elements.dueDate.value = toDateInputValue(nextDue);
  elements.disputeForm.elements.id.value = `du_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  elements.disputeDialog.showModal();
}

function closeDialog() {
  elements.disputeDialog.close();
}

function createDispute(event) {
  event.preventDefault();
  if (!ensureProductAccess("create a dispute packet")) return;
  const formData = new FormData(elements.disputeForm);
  const dispute = {
    processor: String(formData.get("processor")),
    id: String(formData.get("id")).trim(),
    orderId: String(formData.get("orderId")).trim(),
    customer: String(formData.get("customer")).trim(),
    email: String(formData.get("email")).trim(),
    amount: Number(formData.get("amount")),
    reason: String(formData.get("reason")),
    dueDate: String(formData.get("dueDate")),
    status: "collecting",
    product: String(formData.get("product")).trim(),
    notes: String(formData.get("notes")).trim(),
    evidence: [],
    narrative: ""
  };

  if (state.disputes.some(item => item.id === dispute.id)) {
    notify("A dispute with that ID already exists.");
    return;
  }

  dispute.narrative = buildNarrative(dispute);
  state.disputes.unshift(dispute);
  state.selectedId = dispute.id;
  persist();
  closeDialog();
  render();
  notify("Dispute packet created.");
}

function importCsv(event) {
  if (!ensureProductAccess("import disputes")) {
    event.target.value = "";
    return;
  }
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    const imported = rows.map(rowToDispute).filter(Boolean);
    const existingIds = new Set(state.disputes.map(dispute => dispute.id));
    const unique = imported.filter(dispute => !existingIds.has(dispute.id));
    state.disputes = [...unique, ...state.disputes];
    state.selectedId = unique[0]?.id || state.selectedId;
    persist();
    render();
    notify(`${unique.length} dispute records imported.`);
  };
  reader.readAsText(file);
  event.target.value = "";
}

function exportCsv() {
  if (!ensureProductAccess("export disputes")) return;
  const headers = ["id", "processor", "orderId", "customer", "email", "amount", "reason", "dueDate", "status", "product", "notes", "evidence"];
  const rows = state.disputes.map(dispute => headers.map(header => {
    const value = header === "evidence" ? dispute.evidence.join("|") : dispute[header];
    return csvCell(value);
  }).join(","));
  downloadFile(`disputedesk-export-${toDateInputValue(new Date())}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv");
}

function copyPacket() {
  if (!ensureProductAccess("copy an evidence packet")) return;
  const dispute = getSelected();
  if (!dispute) return;
  const packet = buildPacket(dispute);
  navigator.clipboard?.writeText(packet)
    .then(() => notify("Packet copied."))
    .catch(() => {
      elements.narrativeInput.select();
      notify("Clipboard unavailable. Rebuttal text selected.");
    });
}

function downloadPacket() {
  if (!ensureProductAccess("download an evidence packet")) return;
  const dispute = getSelected();
  if (!dispute) return;
  downloadFile(`${dispute.id}-evidence-packet.txt`, buildPacket(dispute), "text/plain");
}

function buildPacket(dispute) {
  const reason = getReason(dispute);
  const guide = getProcessorGuide(dispute.processor);
  const qaChecks = getPacketQaChecks(dispute);
  const nextActions = getNextBestActions(dispute).map(item => `- ${item}`).join("\n");
  const completed = getCompletedEvidence(dispute).map(item => `- ${item[1]}`).join("\n") || "- No evidence marked complete";
  const missing = getMissingEvidence(dispute).map(item => `- ${item[1]}`).join("\n") || "- None";
  const qa = qaChecks.map(item => `- ${item.ok ? "PASS" : "FIX"}: ${item.title} - ${item.body}`).join("\n");
  const processorSteps = guide.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const narrative = elements.narrativeInput.value.trim() || dispute.narrative || buildNarrative(dispute);

  return [
    "DISPUTE EVIDENCE PACKET",
    "",
    `Dispute ID: ${dispute.id}`,
    `Processor: ${dispute.processor}`,
    `Order ID: ${dispute.orderId}`,
    `Customer: ${dispute.customer} <${dispute.email}>`,
    `Amount: ${formatMoney(dispute.amount)}`,
    `Reason: ${reason.label}`,
    `Evidence due: ${formatDate(dispute.dueDate)}`,
    `Packet confidence: ${getConfidence(dispute)}%`,
    "",
    "Merchant outcome target",
    reason.focus,
    "",
    "Timeline",
    buildPacketTimeline(dispute),
    "",
    "Rebuttal letter",
    narrative,
    "",
    "Completed evidence",
    completed,
    "",
    "Missing evidence",
    missing,
    "",
    "Packet QA",
    qa,
    "",
    "Next best actions",
    nextActions,
    "",
    "Processor submission guide",
    `${guide.label}: ${guide.destination}`,
    processorSteps,
    "",
    "Submission cautions",
    "- Review every statement and remove anything unsupported before submitting.",
    "- Do not rely on external links, audio, or video as the only evidence; attach processor-accepted files.",
    "- Treat processor submission as final once sent unless the processor explicitly allows edits.",
    "",
    "Internal notes",
    dispute.notes || "None",
    "",
    "Important disclaimer",
    "DisputeDesk is lower-cost AI-assisted operational software built with Codex from OpenAI. It is not legal advice, financial advice, processor advice, or a guarantee of dispute outcomes. AI outputs may be incomplete, inaccurate, or unsuitable for a specific dispute. The software is provided for customer-directed use. The merchant accepts the risks of using AI software and is responsible for reviewing all outputs, complying with processor and card-network rules, protecting customer data, and deciding whether to submit, accept, refund, or escalate a dispute. DisputeDesk disclaims liability for customer use of generated drafts, checklists, exports, and business decisions to the maximum extent permitted by law."
  ].join("\n");
}

function buildNarrative(dispute) {
  const reason = getReason(dispute);
  const completed = getCompletedEvidence(dispute).map(item => item[1].toLowerCase());
  const evidenceLine = completed.length
    ? `The attached evidence includes ${humanList(completed)}.`
    : "The evidence package should attach records that directly answer the cardholder claim.";

  return [
    `We are responding to dispute ${dispute.id} for order ${dispute.orderId}, a ${formatMoney(dispute.amount)} purchase of ${dispute.product}.`,
    reason.focus,
    evidenceLine,
    dispute.notes ? `Merchant notes: ${dispute.notes}` : "",
    "Based on the attached timeline and supporting records, the charge was valid and the merchant fulfilled the purchased product or service."
  ].filter(Boolean).join("\n\n");
}

function getProcessorGuide(processor) {
  return processorGuides[String(processor || "").trim().toLowerCase()] || processorGuides.default;
}

function getPacketQaChecks(dispute) {
  const missing = getMissingEvidence(dispute);
  const completed = getCompletedEvidence(dispute);
  const narrative = elements.narrativeInput?.value.trim() || dispute.narrative || "";
  const days = daysUntil(dispute.dueDate);
  const guide = getProcessorGuide(dispute.processor);
  return [
    {
      title: "Evidence is reason-specific",
      ok: completed.length >= Math.ceil(getReason(dispute).checklist.length * 0.6),
      body: completed.length
        ? `${completed.length} evidence items directly match the ${getReason(dispute).label.toLowerCase()} reason.`
        : "No reason-specific evidence is checked yet."
    },
    {
      title: "Known gaps are visible",
      ok: missing.length === 0,
      body: missing.length === 0
        ? "The checklist has no remaining gaps before submission review."
        : `${missing.length} checklist item(s) still need support, starting with ${missing[0][1]}.`
    },
    {
      title: "Rebuttal is specific",
      ok: narrative.length >= 160 && narrative.includes(dispute.orderId),
      body: narrative.length >= 160
        ? "The draft names the order and has enough detail for review."
        : "Add concrete timeline, policy, fulfillment, or usage details before export."
    },
    {
      title: "Deadline is still actionable",
      ok: days >= 0,
      body: days >= 0 ? `${formatDays(days)} to submit through ${guide.label}.` : "The evidence deadline appears overdue."
    },
    {
      title: "One-shot submission risk is surfaced",
      ok: true,
      body: "The packet reminds the merchant to review everything before processor submission and avoids asking banks to click links."
    },
    {
      title: "No outcome guarantee",
      ok: true,
      body: "The export states that DisputeDesk is AI-assisted software, not legal advice or a win guarantee."
    }
  ];
}

function getNextBestActions(dispute) {
  const actions = [];
  const missing = getMissingEvidence(dispute);
  const narrative = elements.narrativeInput?.value.trim() || dispute.narrative || "";
  const days = daysUntil(dispute.dueDate);
  if (days < 0) {
    actions.push("Record missed deadline; do not market this as recoverable.");
  } else if (days <= 2) {
    actions.push("Finish evidence today before polishing copy.");
  }
  missing.slice(0, 2).forEach(item => actions.push(`Collect ${item[1].toLowerCase()}.`));
  if (narrative.length < 160) actions.push("Add a concise timeline to the rebuttal.");
  if (missing.length === 0 && dispute.status !== "ready") actions.push("Mark ready, then submit through the processor dashboard.");
  if (actions.length === 0) actions.push("Review final packet and submit through the processor dashboard.");
  return actions.slice(0, 4);
}

function buildPacketTimeline(dispute) {
  const timeline = [
    `Purchase or invoice: ${dispute.orderId}`,
    `Product or service: ${dispute.product}`,
    `Dispute reason: ${getReason(dispute).label}`,
    `Evidence due: ${formatDate(dispute.dueDate)} (${formatDays(daysUntil(dispute.dueDate))})`
  ];
  if (dispute.notes) timeline.push(`Merchant notes: ${dispute.notes}`);
  return timeline.map(item => `- ${item}`).join("\n");
}

function getReason(dispute) {
  return reasonCatalog[dispute.reason] || reasonCatalog.general;
}

function getCompletedEvidence(dispute) {
  const evidence = new Set(dispute.evidence || []);
  return getReason(dispute).checklist.filter(item => evidence.has(item[0]));
}

function getMissingEvidence(dispute) {
  const evidence = new Set(dispute.evidence || []);
  return getReason(dispute).checklist.filter(item => !evidence.has(item[0]));
}

function getConfidence(dispute) {
  const reason = getReason(dispute);
  const completedWeight = getCompletedEvidence(dispute).length / reason.checklist.length;
  const statusBoost = dispute.status === "submitted" ? 6 : dispute.status === "ready" ? 4 : 0;
  const narrativeBoost = (dispute.narrative || dispute.notes || "").length > 80 ? 8 : 2;
  const deadline = daysUntil(dispute.dueDate);
  const deadlinePenalty = deadline < 0 ? 18 : deadline <= 2 ? 10 : deadline <= 5 ? 4 : 0;
  const score = reason.baseline + completedWeight * 45 + statusBoost + narrativeBoost - deadlinePenalty;
  return clamp(Math.round(score), 0, 96);
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateString}T00:00:00`);
  return Math.ceil((due - today) / 86400000);
}

function deadlineClass(days) {
  if (days <= 2) return "hot";
  if (days <= 5) return "warm";
  return "cool";
}

function formatDays(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "1d left";
  return `${days}d left`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function average(values) {
  const usable = values.filter(value => Number.isFinite(value));
  if (usable.length === 0) return 0;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function humanList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function buildUtmUrl(baseUrl, channel) {
  const fallback = "https://yourdomain.com";
  let url;
  try {
    url = new URL(baseUrl || fallback);
  } catch {
    url = new URL(fallback);
  }
  url.searchParams.set("utm_source", channel.key);
  url.searchParams.set("utm_medium", "paid");
  url.searchParams.set("utm_campaign", "chargeback_evidence_mvp");
  url.searchParams.set("utm_content", channel.headline.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return url.toString();
}

function loadBusinessSettings() {
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    return normalizeBusinessSettings(raw ? { ...clone(defaultBusinessSettings), ...JSON.parse(raw) } : clone(defaultBusinessSettings));
  } catch {
    return clone(defaultBusinessSettings);
  }
}

function normalizeBusinessSettings(settings) {
  const next = { ...clone(defaultBusinessSettings), ...(settings || {}) };
  next.planPrice = Number(next.planPrice || CORE_PLAN_PRICE);
  if (next.planPrice !== CORE_PLAN_PRICE) next.planPrice = CORE_PLAN_PRICE;
  if (next.coreLink === LEGACY_GROWTH_PAYMENT_LINK) next.coreLink = "";
  ["trialLink", "starterLink", "growthLink", "scaleLink"].forEach(key => {
    next[key] = "";
  });
  return next;
}

function loadLicense() {
  if (isLocalOperatorHost()) return localOperatorLicense();
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw ? { ...defaultLicense(), ...JSON.parse(raw), operatorLocal: false } : defaultLicense();
  } catch {
    return defaultLicense();
  }
}

function defaultLicense() {
  return {
    active: false,
    operatorLocal: false,
    email: "",
    token: "",
    plan: "",
    checkedAt: "",
    message: "Paid access required. Subscribe with Stripe, then verify the checkout email and access credential."
  };
}

function hydrateLicenseFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("session_id") || params.get("checkout_session_id") || params.get("license_token") || "";
  const email = params.get("email") || "";
  if (!token && !email) return;
  state.license = {
    ...state.license,
    token: token || state.license.token || "",
    email: email || state.license.email || "",
    message: token
      ? "Checkout Session ID detected. Enter the checkout email and verify access."
      : state.license.message
  };
  persistLicense();
}

function localOperatorLicense() {
  return {
    ...defaultLicense(),
    active: true,
    operatorLocal: true,
    plan: "operator",
    checkedAt: new Date().toISOString(),
    message: "Local operator mode is unlocked on this computer. Public customer access still requires paid Stripe license verification."
  };
}

function isLocalOperatorHost() {
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname) || window.location.protocol === "file:";
}

function persistBusiness() {
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(state.business));
}

function persistLicense() {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(state.license));
}

function canSyncCustomerWorkspace() {
  return hasProductAccess() && Boolean(state.license.operatorLocal || (state.license.email && state.license.token));
}

function workspaceAuthPayload() {
  return {
    email: state.license.email || "",
    token: state.license.token || ""
  };
}

async function syncCustomerWorkspace(options = {}) {
  if (!canSyncCustomerWorkspace() || workspaceSyncInFlight) return false;
  workspaceSyncInFlight = true;
  try {
    const params = new URLSearchParams();
    const auth = workspaceAuthPayload();
    if (auth.email) params.set("email", auth.email);
    if (auth.token) params.set("token", auth.token);
    const response = await fetch(`/api/workspace${params.toString() ? `?${params}` : ""}`);
    if (!response.ok) throw new Error("Workspace fetch failed");
    const payload = await response.json();
    if (!payload.ok || !payload.active) throw new Error(payload.error || "Workspace unavailable");
    if (payload.account?.workspaceId) state.license.workspaceId = payload.account.workspaceId;

    const remoteDisputes = Array.isArray(payload.workspace?.disputes) ? payload.workspace.disputes : [];
    if (!payload.workspace?.empty && remoteDisputes.length > 0) {
      state.disputes = remoteDisputes;
      state.selectedId = state.disputes[0]?.id || null;
      persistDisputesLocally();
      state.license.workspaceSyncedAt = payload.workspace.updatedAt || new Date().toISOString();
      state.license.message = payload.message || "Customer workspace loaded from encrypted server storage.";
      persistLicense();
      return true;
    }

    return await saveCustomerWorkspace({ quiet: true });
  } catch {
    if (!options.quiet) notify("Customer workspace sync failed. Local browser records are still available.");
    return false;
  } finally {
    workspaceSyncInFlight = false;
  }
}

async function saveCustomerWorkspace(options = {}) {
  if (!canSyncCustomerWorkspace()) return false;
  try {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...workspaceAuthPayload(),
        disputes: state.disputes
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Workspace save failed");
    state.license.workspaceId = payload.account?.workspaceId || state.license.workspaceId || "";
    state.license.workspaceSyncedAt = payload.workspace?.updatedAt || new Date().toISOString();
    state.license.message = payload.message || "Workspace saved to encrypted server storage.";
    persistLicense();
    if (!options.quiet) notify("Customer workspace saved.");
    return true;
  } catch {
    if (!options.quiet) notify("Customer workspace save failed. Local browser records are still available.");
    return false;
  }
}

function queueWorkspaceSave() {
  if (!canSyncCustomerWorkspace()) return;
  clearTimeout(workspaceSaveTimer);
  workspaceSaveTimer = setTimeout(() => {
    saveCustomerWorkspace({ quiet: true });
  }, 700);
}

function loadFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistFeedback() {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(state.feedback));
}

function loadPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistPayments() {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(state.payments));
}

function loadIncomeEvidence() {
  try {
    const raw = localStorage.getItem(INCOME_EVIDENCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistIncomeEvidence() {
  localStorage.setItem(INCOME_EVIDENCE_KEY, JSON.stringify(state.incomeEvidence));
}

function loadLeads() {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLeads() {
  localStorage.setItem(LEADS_KEY, JSON.stringify(state.leads));
}

function loadOpsActions() {
  try {
    const raw = localStorage.getItem(OPS_ACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistOpsActions() {
  localStorage.setItem(OPS_ACTIONS_KEY, JSON.stringify(state.opsActions));
}

function installTrackingTags() {
  const settings = state.business;
  if (settings.googleTagId && !document.querySelector("[data-tracker='google']")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.googleTagId)}`;
    script.dataset.tracker = "google";
    document.head.append(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", settings.googleTagId);
  }

  if (settings.metaPixelId && !window.fbq) {
    window.fbq = function fbq() {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    window.fbq.queue = [];
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.tracker = "meta";
    document.head.append(script);
    window.fbq("init", settings.metaPixelId);
    window.fbq("track", "PageView");
  }

  if (settings.redditPixelId && !window.rdt) {
    window.rdt = function rdt() {
      window.rdt.callQueue.push(arguments);
    };
    window.rdt.callQueue = [];
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.redditstatic.com/ads/pixel.js";
    script.dataset.tracker = "reddit";
    document.head.append(script);
    window.rdt("init", settings.redditPixelId);
    window.rdt("track", "PageVisit");
  }

  if (!window.__disputeDeskPageTracked) {
    window.__disputeDeskPageTracked = true;
    trackEvent("page_view");
  }
}

function trackEvent(name, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...details });

  if (window.gtag) {
    const gtagName = name === "generate_lead" ? "generate_lead" : name;
    window.gtag("event", gtagName, details);
    if (name === "begin_checkout" && state.business.googleAdsSendTo) {
      window.gtag("event", "conversion", { send_to: state.business.googleAdsSendTo });
    }
  }

  if (window.fbq) {
    const metaName = name === "generate_lead" ? "Lead" : name === "begin_checkout" ? "InitiateCheckout" : "PageView";
    window.fbq("track", metaName, details);
  }

  if (window.rdt) {
    const redditName = name === "generate_lead" ? "Lead" : name === "begin_checkout" ? "AddToCart" : "PageVisit";
    window.rdt("track", redditName, details);
  }

}

function loadDisputes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : isLocalOperatorHost() ? clone(sampleDisputes) : [];
  } catch {
    return isLocalOperatorHost() ? clone(sampleDisputes) : [];
  }
}

function persist() {
  persistDisputesLocally();
  queueWorkspaceSave();
}

function persistDisputesLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.disputes));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];
  const headers = rows[0].map(header => normalizeHeader(header));
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function rowToDispute(row) {
  const id = row.id || row.disputeid || row.dispute || row["dispute_id"];
  if (!id) return null;
  const reason = normalizeReason(row.reason || row.disputereason || row["dispute_reason"]);
  const dispute = {
    id: id.trim(),
    processor: row.processor || row.gateway || "Stripe",
    orderId: row.orderid || row.order || row["order_id"] || "No order",
    customer: row.customer || row.name || "Unknown customer",
    email: row.email || row.customeremail || row["customer_email"] || "unknown@example.com",
    amount: Number(String(row.amount || row.disputedamount || row["disputed_amount"] || "0").replace(/[^0-9.-]/g, "")),
    reason,
    dueDate: normalizeDate(row.duedate || row.due || row["due_date"]) || toDateInputValue(new Date()),
    status: normalizeStatus(row.status || "collecting"),
    product: row.product || row.description || "Purchase",
    notes: row.notes || "",
    evidence: String(row.evidence || "").split("|").map(item => item.trim()).filter(Boolean),
    narrative: row.narrative || ""
  };
  if (!dispute.narrative) dispute.narrative = buildNarrative(dispute);
  return dispute;
}

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/[\s-]+/g, "").replace(/[^a-z0-9_]/g, "");
}

function normalizeReason(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return reasonCatalog[normalized] ? normalized : "general";
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return statusLabels[normalized] ? normalized : "collecting";
}

function normalizeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toDateInputValue(date);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = null;
function notify(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
}
