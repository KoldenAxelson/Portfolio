---
title: 'Why Does RAG Get the Wrong Answer?'
description: "Retrieval-augmented generation looks easy in a demo and breaks in production. Chunking, embeddings, keyword vs. vector vs. hybrid search, reranking, and why a wrong answer is often a search bug."
pubDate: 2026-09-24
tags: ['ml', 'rag', 'search', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
build:
  list: never
thoughts:
  - "The RAG bugs worth chasing usually turn out to be search bugs wearing a chatbot costume."
  - "The model can only answer from what you hand it. Most of the work is deciding what to hand it."
---

The RAG demo in [the first post in this series](/articles/what-is-ml-infrastructure/) made it look easy. A question comes in, the system looks up the right document, pastes it into the prompt, and the model answers from it. Six knowledge cards, one obvious match, done.

Real documents aren't six tidy cards. They're thousands of PDFs, wiki pages and tickets, and the right answer is one sentence buried in one of them.

When a {{< term "rag" >}}RAG{{< /term >}} system gets something wrong, it's tempting to blame the model. Often, though, the model did fine with what it was given. The search handed it the wrong text.

{{< ml-rag >}}

## Cutting documents into pieces

You can't paste a whole library into a prompt, so documents are split into chunks first. {{< term "chunking" >}}Chunking{{< /term >}} sounds like housekeeping, and it quietly decides what your system can answer. Anthropic's write-up on the problem says it plainly: ["The choice of chunk size, chunk boundary, and chunk overlap can affect retrieval performance."](https://www.anthropic.com/news/contextual-retrieval)

Too small, and a chunk loses its context: "It stops working after 30 days" is useless if the chunk doesn't say what *it* is. Too big, and the answer is diluted. Pinecone's guide warns that large chunks ["may introduce noise or dilute the significance of individual sentences"](https://www.pinecone.io/learn/chunking-strategies/). Then there are boundaries: an answer split across two chunks may never be retrieved whole.

{{< ml-chunks >}}

A fix Anthropic published in 2024, contextual retrieval, has a model write a sentence of context onto each chunk before it's indexed ("This chunk is from the remote access policy…"). Combined with keyword search (below), it cut top-20 retrieval failures [by 49% in Anthropic's tests, and by 67% with reranking](https://www.anthropic.com/news/contextual-retrieval).

## Two ways to search

The classic way is keyword search. {{< term "bm25" >}}BM25{{< /term >}}, a ranking formula with roots in [1970s and '80s research](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf), is still the default ranking in widely used search engines such as [Elasticsearch](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity). It's fast, it's exact, and it needs no training and no GPUs. Search for an error code and it finds that error code.

The newer way is vector search. Each chunk becomes an {{< term "embedding" >}}embedding{{< /term >}}, a list of numbers standing for its meaning, stored in a {{< term "vector-database" >}}vector database{{< /term >}}. Chunks that mean similar things get nearby vectors, whatever words they use. Closeness is often measured with {{< term "cosine-similarity" >}}cosine similarity{{< /term >}}; OpenAI's docs [recommend it](https://developers.openai.com/api/docs/guides/embeddings) and note that the choice of measure "typically doesn't matter much."

## Where each one slips

In 2020, a retriever built on learned embeddings [beat BM25 by 9 to 19 points](https://arxiv.org/abs/2004.04906) on finding the right passage for open-domain questions. But not everywhere. The 2021 BEIR {{< term "benchmark" >}}benchmark{{< /term >}} tested retrievers on new kinds of data they weren't trained for and found ["BM25 is a robust baseline"](https://arxiv.org/abs/2104.08663), while the embedding-based models often did worse.

Each method has a blind spot. Vector search understands that "can't reach the office network" is about the VPN, and shrugs at "ERR-4031". Keyword search is the other way round.

## Use both

So a common fix is {{< term "hybrid-search" >}}hybrid search{{< /term >}}: both searches at once, with their rankings merged. A popular merge, and the one Elasticsearch recommends, is [reciprocal rank fusion](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf), a 2009 method that gives each document a score from its position in each list. Its authors found it consistently beat the individual systems it combined. Elasticsearch [offers it built in](https://www.elastic.co/docs/solutions/search/hybrid-search).

{{< ml-search >}}

## Then read more carefully

Both searches are built for speed, so they skim. {{< term "reranking" >}}Reranking{{< /term >}} adds a second pass: take the top results (Anthropic's test took 150) and have a slower model read each one next to the question and reorder them. In 2019, a reranker built on the BERT language model [topped the MS MARCO passage leaderboard](https://arxiv.org/abs/1901.04085), beating the previous best by 27%. It costs time, but only on that shortlist, and providers like [Cohere](https://docs.cohere.com/docs/rerank-overview) sell it as a single API call.

## The failures that remain

Even perfect search has limits. Models can miss what you give them: a 2023 study found they often do best ["when relevant information occurs at the beginning or end of the input context"](https://arxiv.org/abs/2307.03172), and worse when it's in the middle. So stuffing in more chunks isn't free.

Documents go stale, too, and an index that hasn't been rebuilt serves last year's policy with confidence. When two documents disagree, the model has no way of knowing which is current unless the chunk says so. Put dates and sources into your chunks, and show the sources to the user.

And log what was retrieved for every answer. When a user reports a wrong answer, that log tells you in seconds whether search missed or the model misread.

## So why does RAG get the wrong answer?

Often because it was handed the wrong text. The six tidy cards hid the hard part: on real documents, retrieval fails in ordinary search-engine ways, with chunks that lose their context, keyword searches that miss meaning, vector searches that miss exact terms, and good results buried in the middle of a long prompt. So fix the search first, and measure it on real questions with known answers, the way the [evals post](/articles/evals/) describes. Treat a wrong answer as a search bug until the retrieval log proves otherwise.

## References & further reading

In the order the article reaches them, plus the paper that named RAG.

{{< ml-references >}}
