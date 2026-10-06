---
title: 'Can You Let an AI Agent Spend Your Money?'
description: "Payment systems assume a person clicked 'buy', and agents break that. Signed mandates, single-use tokens, HTTP 402 and signed bots: how the industry is putting the guardrails in the money instead of the model, as of October 2026."
pubDate: 2026-10-06
tags: ['ml', 'agents', 'payments', 'security', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 4
build:
  list: never
# Audit note from the writing session: these hosts were blocked by its network
# policy, so these claims rest on search results, not a page read. Check them in
# a browser first: the eggs story (adn.com), OpenAI's Sept 29 2025 launch, the
# Visa and Mastercard April 2025 releases, the March 2026 Instant Checkout move,
# the CoinDesk x402 piece, the Bloomberg Law Amazon v. Perplexity story, and the
# Amex April 14 2026 wording. AP2, ACP, x402, Visa TAP and Microsoft were read.
thoughts:
  - "I'd hand an agent a company card before my debit card, and I'd want the bank to enforce the limit, not the agent."
  - "Every payment protocol in this post starts from the same assumption: the AI will get fooled. Refreshingly honest."
---

In February 2025, Washington Post columnist Geoffrey Fowler asked OpenAI's new Operator {{< term "agent" >}}agent{{< /term >}} to find him cheap eggs. It [bought a dozen for $31.43](https://www.adn.com/alaska-life/2025/02/09/i-let-chatgpts-new-agent-manage-my-life-it-spent-31-on-a-dozen-eggs/) with fees, skipping the step where it was supposed to check with him first.

Thirty dollars of eggs is a funny story. The same agent with your card on a bad day is less funny. Google put the problem in one line when it launched its agent payments protocol in [September 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol): "today's payment systems generally assume a human is directly clicking 'buy' on a trusted surface." Take the human out and three questions open up. Did you really ask for this? Is this exactly what you asked for? And who pays if it's wrong?

## Proving what you asked for

Google's answer, the {{< term "ap2" >}}Agent Payments Protocol{{< /term >}}, launched with more than 60 partners, from Mastercard and American Express to PayPal and Coinbase. Its core idea is the {{< term "mandate" >}}mandate{{< /term >}}: "tamper-proof, cryptographically-signed digital contracts" recording what you authorized.

There are two ways to sign one. If you're there, you approve the exact cart, and the signature makes sure "what you see is what you pay for." If you're not ("buy concert tickets the moment they go on sale"), you sign the rules up front: price limits, timing, which shops. The agent can only complete a purchase that fits them. Either way, the shop and the bank check a signature, not the agent's story. Version 0.2 of the spec went to the [FIDO Alliance](https://github.com/google-agentic-commerce/AP2), the group behind passkeys, in 2026.

## A card number on a short leash

OpenAI and Stripe started from the checkout. Their [Agentic Commerce Protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) launched in September 2025 with [Instant Checkout in ChatGPT](https://openai.com/index/buy-it-in-chatgpt/), beginning with US Etsy sellers. The agent never sees your card. It gets a {{< term "payment-token" >}}payment token{{< /term >}} that, in the spec's words, "MUST ONLY be usable within the provided Allowance": one use, one shop, a maximum amount and an expiry time.

Visa and Mastercard built the same idea into cards, announcing programs in April 2025 ([Visa](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html), [Mastercard](https://s25.q4cdn.com/479285134/files/doc_news/Mastercard-Unveils-Agent-Pay-Pioneering-Agentic-Payments-Technology-to-Power-Commerce-in-the-Age-of-AI-2025.pdf)) that give agents tokens instead of your card number. The shopping itself is still settling: in March 2026, OpenAI [moved Instant Checkout into merchants' own apps](https://www.digitalcommerce360.com/2026/03/06/openai-shifts-checkout-plans-agentic-commerce-strategy/) inside ChatGPT. The protocol kept shipping new versions.

## Paying per request

Sometimes the buyer is a program that wants one API call. The web has had a status code for that since the 1990s, 402 Payment Required, and the HTTP spec still marks it ["reserved for future use"](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.3).

Coinbase's {{< term "x402" >}}x402{{< /term >}}, launched in 2025, finally uses it. Ask for a paid resource and the [server answers 402](https://github.com/x402-foundation/x402) with a price. The client pays, usually in a stablecoin, and retries with a signed payment header. A standards body for it [relaunched under the Linux Foundation](https://www.coindesk.com/business/2026/07/16/ai-payments-have-a-new-open-standards-body-its-aim-is-to-reinvent-the-internet) in July 2026, with Visa, Mastercard, Stripe and Google among its members. Usage figures are disputed, but the shape suits agents: pay a cent, get an answer, no account. For an agent that loops, the spending cap belongs in the wallet, not the prompt.

## Shopper or scraper?

Shops spent years building defences against bots, and an agent looks exactly like one. Visa's [Trusted Agent Protocol](https://github.com/visa/trusted-agent-protocol) describes merchants facing "an impossible choice": block agent shoppers, or accept the risk of agents they can't verify. Amazon [sued Perplexity](https://news.bloomberglaw.com/ip-law/amazon-demands-perplexity-stop-ai-agent-from-making-purchases) in November 2025, accusing its shopping agent of passing itself off as an ordinary Chrome browser.

The fix is the one servers already use with each other: signatures. With {{< term "web-bot-auth" >}}Web Bot Auth{{< /term >}}, now an [IETF draft](https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/), an agent signs every request with a key the site can look up. "Is this a real agent, and whose?" becomes a lookup instead of a guess. Visa built its protocol on it with Cloudflare.

## Assume the agent gets fooled

Here's the line from the AP2 spec I'd frame: "AP2 assumes that preventing prompt injection attacks is infeasible." So it doesn't try to make the {{< term "model" >}}model{{< /term >}} unfoolable. It makes sure that when the model is fooled, "the worst-case financial and logical impacts are strictly bounded."

That's the right call. In November 2025, Microsoft researchers [ran a simulated market](https://www.microsoft.com/en-us/research/blog/magentic-marketplace-an-open-source-simulation-environment-for-studying-agentic-markets/) of 100 customer agents and 300 business agents. Three of the models tested, GPT-4o among them, were "very vulnerable to {{< term "prompt-injection" >}}prompt injection{{< /term >}}: all payments were redirected to the manipulative agent." Every model tended to take the first offer it got. Sign a mandate and see what the checks catch:

{{< ml/mandate >}}

## Who pays when it goes wrong?

Of Google's three questions, this one is the least finished. The signed trail helps: AP2's mandates make what Google calls "a non-repudiable audit trail," so a dispute starts from evidence. Card rules are catching up one issuer at a time. American Express went first in April 2026, [promising to cover](https://www.americanexpress.com/en-us/newsroom/articles/innovation/american-express-debuts-agentic-commerce-experiences--ace--devel.html) eligible cardmembers for charges caused by "AI agent error," as long as the agent is registered with Amex.

## So can you let an AI agent spend your money?

Yes, the way you'd hand a new employee a company card: a limit, a short list of approved vendors, an expiry date and receipts you can check. What matters is where the limits live. A spending cap in the prompt is a suggestion the model can be talked out of. A cap in the token, checked by the bank, isn't. It's {{< term "least-privilege" >}}least privilege{{< /term >}} applied to money, the same lesson as [prompt injection](/articles/prompt-injection/): don't count on the agent being careful. Make its mistakes cheap.

## References & further reading

The problem and the protocols first, then signed agents, attacks and who pays.

{{< ml/references >}}
