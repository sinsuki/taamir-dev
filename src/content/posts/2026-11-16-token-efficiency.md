---
title: "Spending fewer tokens: a practical guide to cheaper LLM apps"
date: 2026-11-16
summary: "What a token is, why it costs money, and the techniques I'd reach for to cut token usage: retrieval, caching, compaction, smaller models, plain code, and more."
tags: [tech]
draft: false
---

When an agent loop runs up a big bill, usually nothing is broken. It's doing exactly what it was asked. It's just re-reading the same instructions, the same documents, and the same chat history on every single call, and paying for all of it each time.

That's the thing about LLM costs. They rarely come from one big mistake. They come from a lot of small, repeated waste. This post is my attempt to write down the techniques that cut that waste, so I understand them better and so you can skip a few expensive lessons.

## First: what is a token, and why does it cost money?

Models don't read words. They read **tokens**, which are chunks of text the model has learned to treat as single units. A common word like "the" is usually one token, while a longer word like "tokenization" gets split into pieces ("token" + "ization"). OpenAI's rough rule of thumb is that [one token is about 4 characters, or about three quarters of a word, in English](https://platform.openai.com/docs/concepts).

Providers charge per token, usually quoted per million tokens, and they charge separately for what you send in (input) and what the model writes back (output). Output is typically the pricier side. In [Anthropic's pricing table](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), for example, Claude Haiku 4.5 is listed at $1 per million input tokens and $5 per million output tokens.

The part that surprises people: a model has no memory between calls. Every request has to include everything the model needs to know, including the system prompt, tool definitions, any documents, and the whole conversation so far. So the cost of a chat or agent grows with every turn, because each turn resends everything before it.

Almost every technique below is one of three moves: **send less**, **pay less for what you resend**, or **don't call the model at all**.

## 1. Retrieve, don't stuff (embeddings + RAG)

The lazy way to answer questions about a 300-page manual is to paste all 300 pages into the prompt. It works, and you pay for all 300 pages on every question.

Retrieval-augmented generation (RAG) fixes this. Ahead of time, you split your documents into chunks and turn each chunk into an **embedding**: a list of numbers that captures what the text means. [OpenAI describes embeddings](https://platform.openai.com/docs/guides/embeddings) as vectors where a small distance between two of them means the texts are closely related. At question time, you embed the question, find the few chunks closest to it, and send only those.

```python
# once, offline
for chunk in split(manual, size=500):
    store.add(vector=embed(chunk), text=chunk)

# per question
hits = store.search(embed(question), top_k=4)
answer = llm(f"Answer using only these notes:\n{hits}\n\nQ: {question}")
```

**When it helps:** large knowledge bases, docs, tickets, anything far bigger than one question needs.
**The tradeoff:** if retrieval grabs the wrong chunks, the model answers confidently from the wrong material. Chunk size, overlap, and how you rank results matter more than the model you pick. You also take on a vector store to maintain.

## 2. Trim the prompt and use compact formats

Prompts grow by accretion. Someone adds a rule, someone adds an example, nobody removes anything. Read your system prompt like a code review: delete repeated instructions, drop examples the model no longer needs, and stop sending fields it never uses.

Format matters too. If you're passing records to the model, send just the fields that matter, in a compact shape.

```text
# before: full API response, nested JSON, 40 fields per order
# after:
id | status | total | updated
1042 | shipped | 89.00 | 2026-11-14
1043 | refunded | 12.50 | 2026-11-15
```

**When it helps:** always. This is the cheapest fix on the list.
**The tradeoff:** cut too far and quality drops quietly. Keep a small set of test questions and re-run them after each trim.

## 3. Prompt caching (prefix caching)

If every request starts with the same long block, such as a system prompt, tool definitions, or a reference document, the provider can save the work it did on that block and reuse it. You pay a reduced rate for the reused part. The catch is that the reused part has to be an exact match **from the start of the prompt**.

The major providers all offer a version of this, with different rules:

- **OpenAI** caches automatically on supported models. Its [prompt caching guide](https://platform.openai.com/docs/guides/prompt-caching) says reused input is discounted up to 95%, the minimum cacheable prompt is 1,024 tokens on newer models, and the whole prefix has to match.
- **Anthropic** has you opt in with a `cache_control` field. Per its [docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), cache reads cost 0.1x the base input price on most models, writes cost 1.25x for the default 5-minute cache, and prompts below a per-model minimum just aren't cached.
- **Google Gemini** applies [implicit caching](https://ai.google.dev/gemini-api/docs/caching) by default on Gemini 2.5 and newer, with minimums of 2,048 to 4,096 tokens depending on the model, and suggests putting large, shared content at the beginning.

The practical rule is the same everywhere: **stable stuff first, changing stuff last.**

```python
messages = [
    system_prompt,        # never changes   -> cacheable
    tool_definitions,     # rarely changes  -> cacheable
    reference_docs,       # per session     -> cacheable
    *recent_turns,
    user_question,        # changes every call, so it goes last
]
```

**When it helps:** chat and agent loops, or many questions against the same document.
**The tradeoff:** one timestamp or random ID near the top of the prompt breaks the match for everything after it. On Anthropic, cache writes cost more than normal input, so a prefix you only use once costs a little extra.

## 4. Summarize or compact the history

Since every turn resends the whole conversation, long chats get expensive. Compaction means replacing older turns with a short summary and keeping only the last few turns word for word.

```python
if count_tokens(history) > LIMIT:
    summary = small_llm("Summarize the decisions and open questions:\n" + old_turns(history))
    history = [summary] + last_n_turns(history, 6)
```

**When it helps:** long-running assistants and agents that work for many steps.
**The tradeoff:** a summary loses detail, and you don't always know which detail will matter later. It can also work against caching. OpenAI's caching guide notes that [compaction changes the prefix](https://platform.openai.com/docs/guides/prompt-caching), so the next request may reuse less of the cache, and suggests comparing total input cost before and after.

## 5. Route to smaller models, or cascade

Not every request needs the biggest model. Classifying a ticket, pulling a date out of an email, or checking whether a reply is polite are all jobs a small, cheap model often handles fine.

**Routing** sends each request to a model sized for it. A **cascade** tries the cheap model first and escalates only when the answer looks weak.

```python
answer = small_model(task)
if not passes_checks(answer):      # schema valid? confident? tests pass?
    answer = large_model(task)
```

The research backs the idea. The [FrugalGPT paper](https://arxiv.org/abs/2305.05176) reported that a learned cascade could match the best single model's performance with up to 98% cost reduction on the tasks they tested. That's their result on their benchmarks, not a promise for your app.

**When it helps:** high volume with a mix of easy and hard requests.
**The tradeoff:** the "is this good enough?" check is the hard part. A weak check either escalates everything (no savings) or lets bad answers through.

## 6. Do deterministic work in plain code

This is my favorite one, because the cheapest token is the one you never send.

If a step has one correct answer that you can compute, such as parsing a log, comparing timestamps, diffing two files, or doing math, write code for it. Code is faster, free to run, and gives the same answer every time.

I learned this building my [incident responder](https://github.com/sinsuki/incident-responder). The detective work (finding the error spike, matching it to the code change that caused it, picking and verifying a fix) is all plain code. In my tests it solved 20 out of 20 simulated outages using 0 AI tokens. The model is optional and only polishes the wording of the final report. My takeaway was that a lot of what looks like "AI work" is really checkable logic.

**When it helps:** any step with a clear, testable answer.
**The tradeoff:** you have to write and maintain that code, and it won't handle the messy, open-ended cases a model can.

## 7. Limit and structure the output

Output tokens are usually the expensive ones, so ask for less. Set a maximum output length, ask for the answer without a preamble, and when another program will read the result, ask for structured output.

[OpenAI's Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) constrain the response to a JSON Schema you supply, so you get exactly the fields you asked for.

```python
schema = {"type": "object",
          "properties": {"category": {"enum": ["billing", "bug", "other"]},
                         "urgent": {"type": "boolean"}},
          "required": ["category", "urgent"]}
# returns {"category": "bug", "urgent": true} instead of two paragraphs
```

**When it helps:** classification, extraction, anything a program consumes.
**The tradeoff:** a hard output cap can cut an answer off mid-sentence. And reasoning models may need room to think, so a cap that's too tight can hurt quality.

## 8. Batch the work that can wait

If nobody is waiting on the answer, like nightly report generation, re-labeling a dataset, or running evals, use a batch API. You upload many requests at once and collect the results later at a discount. Both [OpenAI](https://platform.openai.com/docs/guides/batch) and [Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) list a 50% discount, with results within 24 hours (Anthropic says most batches finish within an hour).

**When it helps:** offline, bulk, or scheduled jobs.
**The tradeoff:** it's slow by design. Never put it behind anything a user is waiting on.

## 9. Semantic caching of answers

Prompt caching saves part of the work. A semantic cache skips the model call entirely. You store past questions with their answers, and when a new question means nearly the same thing as an old one ("how do I reset my password" vs. "forgot my password, help"), you return the saved answer. Embeddings measure "nearly the same." Libraries like [GPTCache](https://github.com/zilliztech/GPTCache) are built for this.

```python
hit = cache.search(embed(question), threshold=0.92)  # illustrative threshold
if hit:
    return hit.answer
answer = llm(question)
cache.add(embed(question), answer)
```

**When it helps:** support bots and FAQs, where many people ask the same things.
**The tradeoff:** two questions can look similar and need different answers ("cancel my order" vs. "cancel my subscription"). Set the threshold too loose and you serve wrong answers confidently. Never cache answers that depend on who's asking or on data that changes.

## How I'd decide

When a bill looks too high, this is the order I'd go in:

1. **Measure first.** Log input, output, and cached tokens per request. Find out where the tokens actually go before fixing anything.
2. **Does this step need a model at all?** If it has one right answer, write code.
3. **Is the prompt bloated?** Trim it and compact the data format.
4. **Am I resending the same prefix?** Put stable content first and turn on caching.
5. **Am I stuffing documents?** Switch to retrieval.
6. **Is the history growing forever?** Compact it, then check that caching still pays off.
7. **Is a big model doing a small job?** Route or cascade.
8. **Is the output longer than it needs to be?** Cap it and structure it.
9. **Can it wait?** Batch it.
10. **Do people ask the same thing a lot?** Add a semantic cache, carefully.

And after each change, re-run a fixed set of test cases. A cheaper app that gives worse answers isn't a win, just a different bill.
