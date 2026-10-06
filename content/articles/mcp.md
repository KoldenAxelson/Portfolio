---
title: 'What Is MCP, and Why Did Every AI App Plug Into It?'
description: "The Model Context Protocol is a USB-C port for AI apps: one standard plug between models and tools. How it works on the wire, why it went stateless in 2026, what it costs in context, and why every server you install is code you're trusting, as of October 2026."
pubDate: 2026-10-06
tags: ['ml', 'agents', 'protocols', 'security', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 1
build:
  list: never
# Audit note from the writing session: modelcontextprotocol.io was blocked by
# its network policy, so spec quotes were read from the site's own source files
# on GitHub (modelcontextprotocol/modelcontextprotocol, docs/). The Hugging Face
# course was read from its GitHub source. Everything else was read on the page.
thoughts:
  - "It's JSON-RPC and a list of tools. The boring part is exactly why it won."
  - "Every MCP server you install is a dependency holding your credentials. Review it like one."
---

Most of us have a drawer of old chargers: one for the camera, one for the old phone, one for something nobody remembers owning. USB-C didn't make devices smarter. It made them all take the same plug.

AI apps had the same drawer. In November 2024, Anthropic released the {{< term "mcp" >}}Model Context Protocol{{< /term >}} and named the problem in one line: ["Every new data source requires its own custom implementation, making truly connected systems difficult to scale."](https://www.anthropic.com/news/model-context-protocol) The project's docs make the comparison for you: ["Think of MCP like a USB-C port for AI applications."](https://modelcontextprotocol.io/docs/getting-started/intro)

## Fifty connectors or fifteen

Say you have 5 AI apps and 10 tools: a ticket queue, a database, your docs and so on. Without a shared protocol, every pairing needs its own connector. [Hugging Face's MCP course](https://huggingface.co/learn/mcp-course/unit1/key-concepts) calls this M×N: 50 integrations to build and keep working. With one protocol, each app speaks it once and each tool does too. That's M+N: 15.

If you've used a code editor in the last decade, you've seen this trick before. The Language Server Protocol let any editor talk to any language's tooling, and the [MCP spec](https://modelcontextprotocol.io/specification/2025-11-25) says it "takes some inspiration" from it.

## What's on the wire

An MCP setup has three parts. The host is the AI app you use, like Claude Desktop or an IDE. Inside it, a client holds one connection to each {{< term "mcp-server" >}}MCP server{{< /term >}}, a small program that wraps something useful. Servers offer tools the {{< term "model" >}}model{{< /term >}} can call, resources it can read, and prompt templates.

The messages are plain JSON-RPC 2.0. A local server runs as a subprocess and talks over stdin and stdout; a remote one talks over HTTP. The app asks for the tool list, and each tool arrives with a name, a description and the arguments it takes. The model reads those descriptions to decide what to call, so they become part of its prompt. Watch one exchange, then swap in a server that abuses that:

{{< ml/wire >}}

## Everyone plugged in

Adoption came fast. OpenAI added MCP to its Agents SDK in [March 2025](https://github.com/openai/openai-agents-python/releases/tag/v0.0.7), GitHub released [its own MCP server](https://github.com/github/github-mcp-server/releases/tag/v0.1.0) in April, Microsoft made it [generally available in Copilot Studio](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/model-context-protocol-mcp-is-now-generally-available-in-microsoft-copilot-studio) in May, and Google launched [managed MCP servers](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services) for its cloud in December.

That same month, Anthropic [handed MCP to the Linux Foundation's](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation) new Agentic AI Foundation, co-founded with OpenAI and Block, and counted more than 10,000 active public servers. By July 2026, the official SDKs were pulling [400 million or more downloads](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude) a month.

## Going stateless

The newest change is one ops people will appreciate. Until mid-2026, every connection opened with a handshake that the server had to remember, which meant sticky sessions and load balancers that had to [read the JSON to route it](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/). The [July 28, 2026 spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/) dropped the handshake and the session ID, so every request now carries its own version and client details. In the maintainers' words: "Any request can now land on any server instance behind a plain round-robin load balancer without needing shared storage."

The cost is churn. That's the fifth version of the spec in under two years, and plenty of tutorials still teach the handshake. Flip the demo between versions to see what changed.

## Every server is code you trust

MCP's own [security policy](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/SECURITY.md) is blunt: "Local MCP servers are trusted like any other software you install." The trouble so far looks like it. In April 2025, Invariant Labs demonstrated {{< term "tool-poisoning" >}}tool poisoning{{< /term >}}, [instructions hidden in a tool's description](https://github.com/invariantlabs-ai/mcp-injection-experiments), and servers that quietly change their tools after you've approved them. A bug in mcp-remote, a widely used helper, [let a malicious server run commands](https://github.com/advisories/GHSA-6xpm-ggf7-wc3p) on the machine connecting to it. And in September 2026, CISA put an MCP login bypass in the LiteLLM gateway on its list of [vulnerabilities exploited in the wild](https://github.com/BerriAI/litellm/security/advisories/GHSA-7488-6r32-c95q).

The spec says there "SHOULD always be a human in the loop with the ability to deny tool invocations." As the demo shows, that person can only deny what the approval box shows them. It's {{< term "prompt-injection" >}}prompt injection{{< /term >}} again, arriving through the tool list, and [the same defences apply](/articles/prompt-injection/).

## Tools cost context

Every tool description sits in the model's {{< term "context-window" >}}context window{{< /term >}} before you've typed a word. In Anthropic's [example](https://www.anthropic.com/engineering/advanced-tool-use), five servers bring 58 tools and about 55,000 {{< term "token" >}}tokens{{< /term >}}. Letting the model search for tools cut that by 85%, and having it [call tools from code](https://www.anthropic.com/engineering/code-execution-with-mcp) cut one example by 98.7%. [The onboarding post](/articles/context-engineering/) has the details. Keep the list short, or make it searchable.

## So why did every AI app plug into it?

For the same reason USB-C won: one plug beats fifty cables, and on the wire it's boring JSON that any proxy log can show you. But a standard plug doesn't make the thing you plug in safe. Treat each MCP server like any dependency that holds your credentials: pin its version, read what you install, give it {{< term "least-privilege" >}}least privilege{{< /term >}}, and make sure the approval box shows the arguments.

## References & further reading

The launch and the spec first, then adoption, the stateless rewrite, security and cost.

{{< ml/references >}}
