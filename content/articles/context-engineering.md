---
title: 'How Do You Onboard an AI Agent?'
description: "Context engineering for people who write runbooks: why a bigger context window isn't a bigger brain, and how AGENTS.md, skills, tool search and compaction decide what an agent reads, and when."
pubDate: 2026-10-06
tags: ['ml', 'agents', 'context', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 3
build:
  list: never
# Audit note from the writing session: these hosts were blocked by its network
# policy, so these were read from mirrors and source repos, not the live page:
# Lütke's post (x.com), Lost in the Middle (arxiv.org), Chroma's Context Rot
# report (trychroma.com) and the agents.md site's 60,000 figure. Every
# anthropic.com, claude.com and Claude docs claim was read on the page.
thoughts:
  - "Every trick in this post is something a decent team lead already does for a new hire. We just had to write it down for the robot."
  - "The context window is a desk, not a brain. Mine is also covered in sticky notes."
---

On a new hire's first day, you hand them a laptop, a README and the name of someone to ask. You don't print the whole wiki and staple it to their chest. AI {{< term "agent" >}}agents{{< /term >}} often get exactly that: every instruction, every tool and every document someone thought might help, loaded before they start.

In June 2025, Shopify CEO Tobi Lütke suggested a better name for the job than prompt engineering. He called it {{< term "context-engineering" >}}context engineering{{< /term >}}: ["the art of providing all the context for the task to be plausibly solvable by the LLM."](https://x.com/tobi/status/1935533422589399127) Anthropic's version, from [September 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), is the one I'd pin above the desk: find "the smallest possible set of high-signal tokens" that gets the job done.

## A bigger desk, not a bigger brain

Everything a {{< term "model" >}}model{{< /term >}} works with at once sits in its {{< term "context-window" >}}context window{{< /term >}}: its instructions, the conversation, every file it has read. As of October 2026, [Anthropic's biggest models](https://platform.claude.com/docs/en/build-with-claude/context-windows) take a million {{< term "token" >}}tokens{{< /term >}}. That sounds like the end of the problem. The same page says otherwise: "As token count grows, accuracy and recall degrade." It calls that {{< term "context-rot" >}}context rot{{< /term >}}.

The evidence goes back a while. A 2023 study found models recall facts best at the start or end of a long input, and [worst in the middle](https://arxiv.org/abs/2307.03172). In July 2025, Chroma [tested 18 models](https://research.trychroma.com/context-rot) and saw performance slide as the input grew, even on simple tasks. On one test, a focused prompt of about 300 tokens beat the full 113,000-token conversation it was cut from.

## A README for agents

The cheapest fix is to write the important things down once. {{< term "agents-md" >}}AGENTS.md{{< /term >}} is a plain Markdown file at the root of a repository, launched in August 2025 as ["a README for agents"](https://agents.md/): how to build, how to test, what not to touch. Its site says more than 60,000 open-source projects use one, and in December 2025 it became a founding project of the Linux Foundation's new [Agentic AI Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation).

This site's own repo has one, and deliberately no CLAUDE.md, because since September 2026 Claude Code [reads AGENTS.md](https://code.claude.com/docs/en/memory) when there's no CLAUDE.md. The same docs give the rule that matters: keep it under about 200 lines, because "longer files consume more context and reduce adherence." A README too long to read doesn't get followed, by people or by models.

## Runbooks on the shelf

A good team doesn't make the new hire memorize every runbook. It keeps them on a shelf with clear labels. Anthropic's {{< term "agent-skill" >}}Agent Skills{{< /term >}}, launched in [October 2025](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), work the same way: each one is a folder of instructions, scripts and reference files. At startup the agent sees only each skill's name and description, about [100 tokens apiece](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). The full instructions, up to 5,000 tokens, load only when a task needs them, and a bundled script can run without its code ever entering the window.

Anthropic calls this {{< term "progressive-disclosure" >}}progressive disclosure{{< /term >}}, "like a well-organized manual that starts with a table of contents." In December 2025 it published Skills as [an open standard](https://claude.com/blog/organization-skills-and-directory), and GitHub Copilot, OpenAI's Codex and Google's Gemini CLI now [read the same folders](https://github.com/agentskills/agentskills).

## Fifty-eight tools before hello

Tools cost context too. Every tool an agent can call arrives with a description of what it does and what it takes, and plugging in a few {{< term "mcp" >}}MCP{{< /term >}} servers adds up fast. In Anthropic's [own example](https://www.anthropic.com/engineering/advanced-tool-use), five servers (GitHub, Slack, Sentry, Grafana and Splunk) bring 58 tools and about 55,000 tokens "before the conversation even starts." More tools also make the right one harder to pick: Anthropic's docs say accuracy [degrades past 30 to 50 tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool).

The fix is the shelf again. With {{< term "tool-search" >}}tool search{{< /term >}}, the agent starts with a search box instead of the whole catalog and loads the three to five tools it needs, cutting tool tokens by about 85%. On Anthropic's tests, Opus 4 went from 49% to 74% accuracy with it. Try loading everything up front, then on demand:

{{< ml/context >}}

## Long shifts need handoff notes

Some jobs outlast any window. The standard trick is {{< term "compaction" >}}compaction{{< /term >}}: when the window is nearly full, the model summarizes the history so far and carries on from the summary. Whatever the summary drops is gone, so long-running agents also keep notes in files outside the window. Anthropic reported that [a memory file plus clearing out stale tool results](https://claude.com/blog/context-management) improved one agent's score by 39%, and that the clearing alone cut token use by 84% over a 100-turn test.

Even that isn't enough on its own. Anthropic's write-up on [long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) says it flatly: "Compaction isn't sufficient." What worked is what works for an on-call rotation: a progress file, a feature checklist and a git commit at the end of every session, so the next shift starts from notes instead of memory.

## It fails quietly

When context management breaks, nothing crashes. In March 2026, a Claude Code change meant to clear old reasoning from sessions left idle for an hour had a bug: it [cleared it on every turn](https://www.anthropic.com/engineering/april-23-postmortem) for the rest of the session. The agent kept working, Anthropic wrote, "but increasingly without memory of why it had chosen to do what it was doing."

That's why what an agent reads deserves the same testing as its code. Change the instructions, the skills or the tool set, and rerun your [evals](/articles/evals/) before you trust it.

## So how do you onboard an AI agent?

The way you'd onboard a person. A short README with the things that bite. Runbooks on a shelf with good labels, pulled when needed. A tool catalog they can search instead of a pile on their desk. Handoff notes at the end of every shift. Then check the work, because more context can make an agent worse as easily as better. The windows will keep growing. The desk will still need clearing.

## References & further reading

The definitions first, then the evidence, then AGENTS.md, skills, tools and long-running agents.

{{< ml/references >}}
