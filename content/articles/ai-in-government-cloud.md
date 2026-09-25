---
title: 'Can a Government Agency Just Use ChatGPT?'
description: "Running AI in a government cloud: FedRAMP, GovCloud regions, air-gapped models, audit logs and agents, as of September 2026. Same plumbing as anywhere else, with the boundaries drawn in ink."
pubDate: 2026-09-24
tags: ['ml', 'government', 'security', 'compliance', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
build:
  list: never
thoughts:
  - "Everyone wants the chatbot. The compliance team wants to know where the prompt goes. Both are right."
  - "In the private sector the question is 'does it work?'. In government it's 'does it work, and can you prove where the data went?'"
---

Somewhere in a federal agency right now, someone has pasted a paragraph into a chatbot to make it sound less like a memo. Then someone from the security office walks by and asks the only question that matters: *where did that paragraph just go?*

That's the whole subject in one question. The model is the same model everywhere. What changes in government is the boundary around it: who runs the servers, whose staff can see the prompts, what the data is allowed to touch, and who signed off.

Everything below is as of September 2026. This field moves fast and the rules move with it, so check the dates before you rely on any of it.

## Nothing runs without a signature

Before any system goes live in an agency, an official has to grant an {{< term "authority-to-operate" >}}authority to operate{{< /term >}}, a formal statement that its remaining risk is acceptable. Doing a full security review of every cloud vendor for every agency would take forever, so {{< term "fedramp" >}}FedRAMP{{< /term >}} does it once and agencies [reuse the result](https://www.fedramp.gov/archive/2020-05-07-how-agencies-can-reuse-a-fedramp-authorization/).

For years, FedRAMP rated services [Low, Moderate or High](https://www.fedramp.gov/archive/2017-11-16-understanding-baselines-and-impact-levels/), by how badly a breach would hurt. New rules that [took effect on July 4, 2026](https://www.fedramp.gov/2026/providers/updating/changes/) renamed FedRAMP "authorization" to "certification", partly so nobody confuses FedRAMP's review with the agency's own ATO, and [moved Low, Moderate and High into Classes B, C and D](https://www.fedramp.gov/notices/0004), with a new pilot Class A. You'll still see "FedRAMP High" on many vendor pages for a while. The Defense Department adds its own {{< term "impact-level" >}}impact levels{{< /term >}}: [IL4 and IL5](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-dod-il5) for {{< term "cui" >}}controlled unclassified information{{< /term >}}, and [IL6](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-dod-il6) for classified work up to Secret.

## Four places a model can live

An agency has four options:

- **A certified AI service.** FedRAMP [fast-tracked chat assistants](https://www.fedramp.gov/ai/) from August 2025 to April 2026. ChatGPT Enterprise, Gemini for Government and Perplexity were certified. One condition: anything a model learned from customer data had to stay inside the customer's environment unless the customer said otherwise.
- **A model service in a government region.** AWS lists [Claude, Llama, OpenAI and other models on Bedrock](https://aws.amazon.com/compliance/services-in-scope/FedRAMP/amazon-bedrock-models/) at FedRAMP High (now Class D) and IL4/5 in its {{< term "govcloud" >}}GovCloud{{< /term >}} regions. Microsoft has had [Azure OpenAI at FedRAMP High since 2024](https://devblogs.microsoft.com/azuregov/azure-openai-authorization/).
- **A classified cloud.** Bedrock runs in AWS's [Top Secret](https://aws.amazon.com/blogs/publicsector/amazon-bedrock-launches-with-claude-3-5-sonnet-in-the-aws-top-secret-cloud/) and [Secret](https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-bedrock-is-now-available/) regions, and Microsoft brought [GPT-5.2 to its Secret and Top Secret clouds](https://devblogs.microsoft.com/azuregov/advancing-ai-capabilities-in-azure-for-u-s-government-secret-and-top-secret-clouds/) in January 2026.
- **Your own hardware.** Run an {{< term "open-weights" >}}open-weights{{< /term >}} model inside your own boundary, even an {{< term "air-gapped" >}}air-gapped{{< /term >}} one. Google sells [Gemini on air-gapped hardware](https://cloud.google.com/blog/topics/hybrid-cloud/gemini-is-now-available-anywhere), so "no internet" no longer means "open models only."

{{< ml-govflow >}}

Cost is less of a barrier than it used to be. In August 2025, GSA, the government's central buyer, struck deals putting [ChatGPT Enterprise](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-announces-new-partnership-with-openai-delivering-deep-discount-to-chatgpt-08062025) and [Claude](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-strikes-onegov-deal-with-anthropic-08122025) in front of agencies for $1 each for a year, and [Gemini for Government](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-google-announce-gemini-onegov-agreement-08212025) for 47 cents through 2026. In September 2026, GSA said ChatGPT would move to [50% off pay-as-you-go pricing](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-expands-onegov-ai-offerings-with-discounted-openais-chatgpt-09102026) from October 1.

## The rules on top

Two memos from the White House budget office (OMB) in April 2025 set the ground rules. [M-25-21](https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf) requires testing, impact assessments and human oversight for "high-impact" AI, meaning AI whose output is a principal basis for decisions with a legal, material, binding or significant effect on rights or safety. [M-25-22](https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-22-Driving-Efficient-Acquisition-of-Artificial-Intelligence-in-Government.pdf) has agencies write contracts that "permanently prohibit" vendors from training public or commercial models on non-public agency inputs and outputs without the agency's explicit consent.

Vendor choice is now a policy question too. On February 27, 2026, agencies were directed to stop using Anthropic's models. After a federal court paused that directive, [GSA restored them](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-issues-statement-on-anthropic-preliminary-injunction-04032026) in April 2026, though the dispute was [still unresolved as of September 2026](https://qz.com/pentagon-anthropic-supply-chain-risk-designation-090326). The ops lesson isn't about any one vendor: design so you can swap the model behind your app without re-certifying everything around it.

## Proving what happened

In government, "it worked" isn't enough. You have to show what the model saw and did. In practice that means an {{< term "audit-log" >}}audit log{{< /term >}} of prompts, responses and actions, tied to a person.

OMB's May 2026 logging memo, [M-26-14](https://www.whitehouse.gov/wp-content/uploads/2026/05/M-26-14-Ensuring-Effective-and-Efficient-Agency-Logging-and-Network-Visibility-to-Defend-Against-Evolving-Cyber-Threats.pdf), doesn't mention prompts, but it replaced the old M-21-31 rules and requires logs that show who did what to which data, searchable for at least 6 months and retrievable for 12. Those logs will hold sensitive text, so they need the same protection as the data itself.

## The agent problem

Chat is the easy case: a person reads every answer. {{< term "agent" >}}Agents{{< /term >}}, which act on their own, are arriving in government clouds too. AWS brought [Bedrock AgentCore to GovCloud](https://aws.amazon.com/about-aws/whats-new/2026/05/bedrock-agentcore-launch-aws-govcloud-us/) in May 2026, and Microsoft's [Foundry Agent Service reached Azure Government](https://devblogs.microsoft.com/azuregov/advancing-ai-innovation-in-azure-government/) in September.

An agent that can file, send or change records needs {{< term "least-privilege" >}}least privilege{{< /term >}} and human approval for anything it can't undo. Least privilege is already [a baseline federal control](https://csrc.nist.gov/glossary/term/least_privilege), and both matter more when {{< term "prompt-injection" >}}prompt injection{{< /term >}} can steer the agent.

## So can they just use ChatGPT?

Increasingly, yes, just not the one on your phone. The same families of models now run in certified services, government regions, classified clouds and air-gapped racks. The work is the plumbing it always was: pick the environment that matches the data, keep the prompts inside the boundary, log everything, and keep a person in charge of anything irreversible. It's the same job as anywhere else, with more paperwork, and the paperwork is what earns the trust.

## References & further reading

FedRAMP and DoD first, then the platforms, buying and policy, then logging and agents.

{{< ml-references >}}
