---
title: 'How Do AI Agents Talk to Each Other?'
description: "MCP connects an agent to its tools; A2A connects it to other agents. Agent cards, tasks and their states, why a team of agents burns about 15 times the tokens of a chat, and how a fake business card can hijack the lot, as of October 2026."
pubDate: 2026-10-06
tags: ['ml', 'agents', 'protocols', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 2
build:
  list: never
# Audit note from the writing session: these hosts were blocked by its network
# policy. The A2A spec and blog were read from their GitHub sources and Google's
# launch post from verbatim copies. Not read on the page: the Linux Foundation
# donation release, Cognition's post, the arXiv MAST paper (abstract via a
# copy), Trustwave's original write-up (via OWASP's tracker), and the OWASP
# Agentic Top 10 page itself.
thoughts:
  - "Strip the AI off and A2A is a well-known URL, a JSON-RPC endpoint and a webhook. I've run that stack before."
  - "Two agents passing a job back and forth, and the riskiest part is still trusting a business card."
---

A travel agent booking your flight doesn't get a login to the airline's systems. They call the airline, say what they need, answer a question or two, and get back a confirmation number. Neither side sees how the other works, and neither needs to.

That's the arrangement Google proposed for AI {{< term "agent" >}}agents{{< /term >}} in April 2025, when it launched the {{< term "a2a" >}}Agent2Agent protocol{{< /term >}} with [more than 50 partners](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/), from Salesforce and SAP to PayPal. Google pitched it as an open protocol that "complements Anthropic's Model Context Protocol." Here's what that means, what it looks like on the wire, and where it gets risky.

## Tools versus colleagues

{{< term "mcp" >}}MCP{{< /term >}} [connects an agent to tools](/articles/mcp/): a database, a ticket queue, a file system. A tool does what it's told. A2A is for when the other side is an agent too, with its own model, its own tools and its own judgment, possibly run by another company.

The [spec](https://a2a-protocol.org/latest/specification/) calls this opaque execution: agents collaborate "without needing to share their internal thoughts, plans, or tool implementations." The project's [own one-liner](https://github.com/a2aproject/A2A/blob/main/docs/blog/posts/announcing-1.0.md), from the version 1.0 launch, is the clearest: "MCP inside agents, A2A between agents." It isn't meant for an agent managing its own helpers. That stays inside the app.

## A business card at a well-known address

An A2A agent introduces itself with an {{< term "agent-card" >}}Agent Card{{< /term >}}: a JSON file at a fixed path on its domain, `/.well-known/agent-card.json`, listing its skills, its endpoint and how to log in. Before version 0.3 the file was [called `agent.json`](https://github.com/a2aproject/A2A/blob/main/CHANGELOG.md), so check which one your client asks for. It's an ordinary web resource, and the spec says to serve it with ordinary caching headers.

The rest is plumbing you already run. Requests are JSON-RPC over HTTPS, long answers stream back as Server-Sent Events, and jobs that take hours can report in by webhook. gRPC became an official option in [version 0.3](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade), in July 2025. If you've operated a REST API behind a load balancer, nothing here is exotic.

## Jobs, not function calls

A tool call returns an answer. An A2A request can start a task, and a task has a lifecycle: submitted, working, then completed, failed, canceled or rejected. Two more states pause it while the remote agent waits on the caller: input required and auth required. So the flight agent can ask "which airport?" and wait for the answer on the same task.

Webhooks bring their usual risk. The docs warn servers not to ["blindly trust and send POST requests to any URL provided by a client"](https://github.com/a2aproject/A2A/blob/main/docs/topics/streaming-and-async.md), which is how you end up making server-side requests on an attacker's behalf. Watch a planner hand a trip to a flight agent, then put a look-alike in the directory:

{{< ml/handoff >}}

## Who's actually using it

Google gave A2A to the [Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents) in June 2025, IBM [folded its own agent protocol into it](https://github.com/orgs/i-am-bee/discussions/5) that August, and version 1.0 shipped on March 12, 2026. In August 2026 it [joined the Agentic AI Foundation](https://github.com/a2aproject/A2A/blob/main/docs/blog/posts/a2a-joins-aaif.md), MCP's home. Its steering committee includes AWS, Cisco, Google, IBM, Microsoft, Salesforce, SAP and ServiceNow.

Support is real but partial. Microsoft's Foundry [supports A2A 1.0](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/foundry/agents/how-to/enable-agent-to-agent-endpoint.md) over JSON-RPC only, text only, with no streaming. And MCP is far bigger: Anthropic counted [more than 10,000 public MCP servers](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation) in December 2025, while A2A mostly reports how many organizations back it. My read: agents need their tools far more often than they need strangers.

## More agents, bigger bills

Before wiring agents together, price it. Anthropic's write-up on its [research system](https://www.anthropic.com/engineering/multi-agent-research-system) found agents use about 4 times the {{< term "token" >}}tokens{{< /term >}} of a chat, and {{< term "multi-agent-system" >}}multi-agent systems{{< /term >}} about 15 times. Its team of agents beat a single agent by 90.2% on an internal research test, but Anthropic warned the approach suits work that splits into independent pieces, not tasks with "many dependencies between agents."

Others are blunter. Cognition, the company behind the coding agent Devin, titled a June 2025 post ["Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents), because "actions carry implicit decisions, and conflicting decisions carry bad results." A Berkeley-led study [catalogued 14 ways](https://arxiv.org/abs/2503.13657) multi-agent systems fail, from agents ignoring each other to stopping before the job is done.

## Trusting a stranger's card

Anyone can print a business card. Security researchers at Trustwave showed a fake Agent Card in an open directory, "falsely claiming high trust," [getting picked](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/initiatives/agent_security_initiative/ASI%20Agentic%20Exploits%20%26%20Incidents/ASI_Agentic_Exploits_Incidents.md) by the agent doing the choosing, which then handed it sensitive data. OWASP's [top 10 for agent apps](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) now lists insecure inter-agent communication as its own risk.

The spec's answer is signed cards: clients "SHOULD verify at least one signature before trusting an Agent Card." Signing is optional, though, and a signature proves who published a card, not that what it says is true. The spec never mentions {{< term "prompt-injection" >}}prompt injection{{< /term >}}, but every message from another agent is untrusted input. Treat it like [any other text from outside](/articles/prompt-injection/).

## So how do AI agents talk to each other?

The way companies do. A published contact card, a job ticket with a status, a question or two, and a deliverable at the end, all over the HTTPS, JSON and webhooks you already run. The plumbing is the easy part. The hard parts are the old ones: who is this, should I trust it, and is a second agent worth the bill?

## References & further reading

The launch and the spec first, then governance, cost and security.

{{< ml/references >}}
