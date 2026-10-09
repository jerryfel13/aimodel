import type {
  DataStats,
  DocumentAnalysis,
  DocumentContent,
  ImageResult,
  InsightResult,
  LLMMessage,
  LLMOptions,
  LLMProvider,
  SpreadsheetData,
} from './types';

const ACTION_VERBS = [
  'will', 'should', 'must', 'need', 'needs', 'action', 'plan', 'schedule',
  'review', 'implement', 'ensure', 'complete', 'deliver', 'prepare', 'send',
  'contact', 'follow up', 'next step', 'deadline', 'responsible', 'owner', 'target',
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bulletList(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

const CHAT_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['marketing', 'campaign', 'seo', 'brand', 'advertising'],
    response:
      'Marketing fundamentals that tend to hold up: define a clear ideal customer profile, measure cost per acquisition by channel, and keep messaging consistent across touchpoints. For AI specifically, the highest-ROI use cases today are content drafting, audience segmentation, and ad copy testing at scale.\n\nA practical approach: pick one channel, run a controlled experiment for 4-6 weeks, and compare results against your baseline before expanding. Results vary widely by industry and audience, so treat these as general principles rather than guarantees.',
  },
  {
    keywords: ['sales', 'lead', 'pipeline', 'conversion', 'revenue'],
    response:
      'A practical sales framework: qualify leads with explicit criteria (budget, authority, need, timeline), track conversion rates at each funnel stage, and shorten response times — response speed is consistently correlated with win rates.\n\nAI can help draft outreach, summarize call notes, and prioritize follow-ups. Keep humans in the loop for relationship-critical conversations, and validate any AI-generated claims before sending them to prospects.',
  },
  {
    keywords: ['customer', 'support', 'ticket', 'service'],
    response:
      'For customer support, focus first on response time and first-contact resolution. AI assistants can draft replies from your knowledge base and route tickets, but they should hand off to humans for complex or sensitive issues.\n\nMeasure deflection rate carefully — a high deflection rate can also mean customers are giving up. Review a sample of AI-handled conversations weekly to catch inaccuracies early.',
  },
  {
    keywords: ['hr', 'hiring', 'recruit', 'employee', 'team'],
    response:
      'In hiring, AI works best for screening and scheduling rather than decision-making. Use it to summarize resumes against explicit criteria, but keep final decisions with people and audit for bias.\n\nDocument your criteria before reviewing candidates, and be aware of emerging AI-in-hiring regulations in your jurisdiction. For team productivity, protect focused work blocks — notifications from new AI tools can quietly erase the gains they create.',
  },
  {
    keywords: ['finance', 'budget', 'cash', 'cost', 'accounting'],
    response:
      'For financial planning, start with a rolling 13-week cash flow view — it surfaces problems earlier than annual budgets. AI can help categorize expenses, draft variance explanations, and support scenario modeling, but every output should be checked against your actual books.\n\nNever treat AI-generated numbers as audited figures. For cost reduction, rank expenses by size and by how discretionary they are; the best targets are large and low-risk to change.',
  },
  {
    keywords: ['operation', 'process', 'efficiency', 'workflow', 'automation'],
    response:
      'For operations, map the process before optimizing it. Identify bottlenecks with real cycle-time data, then target the constraint — not the easiest task.\n\nAI can draft SOPs, summarize incident reports, and flag anomalies in logs. Pilot changes on a small scope, measure the baseline first, and roll back if the metric does not improve.',
  },
  {
    keywords: ['ai', 'artificial intelligence', 'llm', 'machine learning', 'gpt', 'model'],
    response:
      'When evaluating AI initiatives, separate automation (doing the same thing cheaper) from augmentation (doing new things). Most near-term value comes from augmentation: drafting, summarizing, and searching internal knowledge.\n\nEstimate ROI as (time saved x hourly cost x volume) minus implementation and review costs — and remember that human review is a recurring cost, not a one-time setup. Start with one well-defined workflow, measure the baseline, and expand only if the pilot shows measurable improvement.',
  },
  {
    keywords: ['productivity', 'time management', 'priorit', 'meeting'],
    response:
      'Productivity systems work when they reduce friction, not when they add tools. A simple weekly review beats a complex stack.\n\nAI can draft agendas, summarize meetings, and triage email, but protect focused work blocks. For meetings, the highest-leverage habit is a written agenda with a decision owner for each item — AI can draft both from prior notes.',
  },
  {
    keywords: ['report', 'data', 'analytics', 'dashboard', 'metric'],
    response:
      'For analytics, start with the decision the report should drive, then work backward to the minimum data needed. AI can draft summaries and highlight outliers, but it cannot validate data quality for you.\n\nAlways state the data window, sample size, and known gaps alongside any finding. If a number looks surprising, check the source extract before sharing it.',
  },
];

const FALLBACK_RESPONSE =
  "Here's a general, vendor-neutral perspective: most AI initiatives succeed when they target a specific, measurable workflow with a clear baseline, and fail when they're adopted as a general 'magic' solution. A good first step is to pick one repetitive task, measure how long it takes today, pilot an AI-assisted version for 2-4 weeks, and compare.\n\nIf you share more context — your industry, team size, or the specific problem — I can give more targeted suggestions. Keep in mind I'm a prototype assistant: for financial, legal, or medical decisions, consult a qualified professional.";

export class DemoProvider implements LLMProvider {
  readonly id = 'demo';
  readonly label = 'Demo (local, no API key)';
  readonly isDemo = true;

  async complete(messages: LLMMessage[], _options?: LLMOptions): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const question = (lastUser?.content ?? '').toLowerCase();
    for (const entry of CHAT_RESPONSES) {
      if (entry.keywords.some((keyword) => question.includes(keyword))) {
        return entry.response;
      }
    }
    return FALLBACK_RESPONSE;
  }

  async analyzeDocument(text: string, filename: string): Promise<DocumentAnalysis> {
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(Boolean).length;
    const summary = sentences.slice(0, 3).join(' ');

    const keyPoints = sentences
      .map((sentence, index) => ({
        sentence,
        score: sentence.length + (index < 5 ? 40 : 0) + (sentence.includes(':') ? 15 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.sentence);

    const actionItems = sentences
      .filter((sentence) => ACTION_VERBS.some((verb) => sentence.toLowerCase().includes(verb)))
      .slice(0, 6);

    return {
      summary:
        (summary || 'The document is too short to summarize automatically.') +
        `\n\n[Demo mode] Extracted ${words} words from ${filename}. This analysis was generated locally without an LLM — configure an API key for AI-powered summarization.`,
      keyPoints,
      actionItems,
    };
  }

  async generateInsights(stats: DataStats): Promise<InsightResult> {
    const observations: string[] = [];
    const recommendations: string[] = [];

    observations.push(
      `The dataset contains ${stats.rowCount} rows and ${stats.columns.length} columns (format: ${stats.format.toUpperCase()}).`,
    );

    for (const column of stats.columns) {
      if (column.type === 'number') {
        observations.push(
          `"${column.name}" ranges from ${column.min} to ${column.max}, with a mean of ${column.mean} and a median of ${column.median}.`,
        );
      } else {
        const top = column.topValues?.[0];
        observations.push(
          `"${column.name}" has ${column.unique} distinct value(s)${top ? `; the most common is "${top.value}" (${top.count} rows)` : ''}.`,
        );
      }
      if (column.missing > 0) {
        const pct = Math.round((column.missing / Math.max(column.count, 1)) * 100);
        observations.push(`"${column.name}" has ${column.missing} missing values (${pct}% of rows).`);
        recommendations.push(
          `Investigate the ${column.missing} missing values in "${column.name}" before drawing conclusions.`,
        );
      }
    }

    const numericColumns = stats.columns.filter((c) => c.type === 'number');
    if (numericColumns.length >= 2) {
      recommendations.push(
        'Compare the numeric columns for relationships, and validate any correlation on additional data before acting on it.',
      );
    }
    recommendations.push(
      'Treat these observations as a starting point. Validate findings against source systems before making business decisions.',
    );

    return { observations, recommendations };
  }

  async generateContent(contentType: string, topic: string, tone: string, length: string): Promise<string> {
    return buildTemplate(contentType, topic, tone, length);
  }

  async generateDocument(prompt: string): Promise<DocumentContent> {
    return {
      title: prompt,
      sections: [
        {
          heading: 'Overview',
          paragraphs: [
            `This document covers ${prompt}. It was generated in demo mode as a template - replace the placeholder content with verified information from your organization.`,
          ],
          bullets: [
            'Define the objective and success metrics',
            'Identify stakeholders and decision-makers',
            'Confirm scope boundaries and exclusions',
          ],
        },
        {
          heading: 'Key Considerations',
          paragraphs: [
            'Evaluate business impact, cost, effort, and risks before proceeding. Validate any figures against source systems rather than assuming them.',
          ],
          bullets: [
            'Business impact: which metrics this affects',
            'Cost and effort: realistic ranges, validated with quotes',
            'Risks: data quality, adoption, and vendor dependence',
          ],
        },
        {
          heading: 'Next Steps',
          paragraphs: [
            'Circulate this draft for feedback and confirm scope before implementation.',
          ],
          bullets: [
            'Review this draft with stakeholders',
            'Confirm scope and success metrics',
            'Schedule the first checkpoint review',
          ],
        },
      ],
    };
  }

  async generateSpreadsheet(prompt: string): Promise<SpreadsheetData> {
    return {
      sheets: [
        {
          name: 'Sample Data',
          headers: ['Item', 'Category', 'Quantity', 'Unit Cost', 'Total'],
          rows: [
            ['Sample item A', 'General', 12, 49.99, 599.88],
            ['Sample item B', 'Services', 4, 199.5, 798.0],
            ['Sample item C', 'General', 25, 9.99, 249.75],
            ['Sample item D', 'Hardware', 2, 899.0, 1798.0],
            ['Sample item E', 'Services', 7, 149.99, 1049.93],
            ['Sample item F', 'General', 18, 24.5, 441.0],
            ['Sample item G', 'Hardware', 1, 1299.0, 1299.0],
            ['Sample item H', 'Services', 3, 349.0, 1047.0],
            ['Sample item I', 'General', 30, 4.99, 149.7],
            ['Sample item J', 'Hardware', 5, 59.99, 299.95],
          ],
        },
      ],
    };
  }

  async generateImage(prompt: string): Promise<ImageResult> {
    const safe = prompt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .slice(0, 90);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#eef4ff"/><rect x="48" y="48" width="928" height="928" rx="32" fill="#ffffff" stroke="#c5d6ff" stroke-width="6"/><circle cx="512" cy="380" r="150" fill="#5b6ef5"/><circle cx="452" cy="340" r="40" fill="#a1baff"/><text x="512" y="660" font-family="sans-serif" font-size="44" font-weight="bold" fill="#0f172a" text-anchor="middle">Demo mode</text><text x="512" y="720" font-family="sans-serif" font-size="28" fill="#475569" text-anchor="middle">Image generation needs an API key with balance</text><text x="512" y="780" font-family="sans-serif" font-size="24" fill="#64748b" text-anchor="middle">Prompt: ${safe}</text></svg>`;
    return {
      base64: Buffer.from(svg, 'utf-8').toString('base64'),
      mimeType: 'image/svg+xml',
    };
  }
}

function buildTemplate(contentType: string, topic: string, tone: string, length: string): string {
  const bulletCount = length === 'short' ? 3 : length === 'long' ? 6 : 4;
  const header =
    `# ${capitalize(contentType)}: ${topic}\n\n` +
    `_Generated by AI Business Assistant (prototype). Review and verify before use. Tone: ${tone}._\n`;

  switch (contentType) {
    case 'email':
      return `${header}
**Subject:** ${topic} — next steps

Hi [Name],

I hope you're doing well. I'm reaching out regarding ${topic}.

${bulletList([
  'Summarize the key point or request related to this topic',
  'Include one specific, measurable detail or example',
  'State the desired outcome or next action clearly',
  'Propose a concrete timeframe for follow-up',
].slice(0, bulletCount))}

Please let me know your thoughts — I'm happy to discuss further.

Best regards,
[Your Name]`;

    case 'proposal':
      return `${header}
## Executive Summary
This proposal outlines a structured approach to ${topic}. It is a draft template — replace bracketed placeholders with validated figures from your organization.

## Objectives
${bulletList([
  'Define the problem this initiative addresses and why it matters now',
  'State the measurable outcome (metric, baseline, target)',
  'Identify the stakeholders and decision-makers',
  'Clarify scope boundaries — what is explicitly out of scope',
].slice(0, bulletCount))}

## Timeline
1. Discovery and requirements validation — [2 weeks]
2. Design and planning — [2 weeks]
3. Implementation — [4-8 weeks]
4. Review and handover — [1 week]

## Investment Considerations
Costs depend on scope, tooling, and internal resourcing. Estimate ranges should be validated with actual vendor quotes before commitment.

## Next Steps
1. Review this draft with stakeholders
2. Confirm objectives and success metrics
3. Schedule a scoping session`;

    case 'summary':
      return `${header}
## Summary: ${topic}

${bulletList([
  'Core context: what the topic covers and why it is relevant',
  'Current state: known facts, figures, or constraints',
  'Key challenge or opportunity',
  'Recommended focus areas',
  'Open questions that need answers',
  'Suggested next step and owner',
].slice(0, bulletCount + 2))}

**Note:** This summary was generated from the topic alone. Upload source material or provide details for a factual summary.`;

    case 'blog post':
      return `${header}
## Introduction
${topic} is a topic many teams are evaluating right now. This post outlines the key considerations and a practical way to get started.

## Key Points
${bulletList([
  'Why this topic matters for business outcomes',
  'Common misconceptions to avoid',
  'A simple framework for evaluation',
  'What early adopters report (anecdotal, not audited)',
  'How to measure a pilot properly',
  'Where to learn more',
].slice(0, bulletCount))}

## Conclusion
Start small, measure honestly, and scale only what the data supports. If you'd like a version tailored to your industry, provide context and regenerate.`;

    default:
      return `${header}
## Executive Summary
This report provides an overview of ${topic}. It is intended as a draft for internal review and should be validated against your organization's data before distribution.

## Background
${topic} is an area of growing importance for organizations evaluating efficiency and competitive positioning. This section should describe the current state, drivers, and constraints — replace with verified information.

## Key Considerations
${bulletList([
  'Business impact: which metrics this topic affects',
  'Cost and effort: realistic ranges, validated with quotes',
  'Risks: data quality, adoption, and vendor dependence',
  'Timeline: a phased approach with measurable checkpoints',
  'Stakeholders: who must be involved and when',
  'Success criteria: how the team will judge the outcome',
].slice(0, bulletCount))}

## Recommendations
${bulletList([
  'Validate the baseline before setting targets',
  'Pilot on a narrow scope with a control comparison',
  'Assign a single accountable owner',
  'Review results after one full cycle before scaling',
].slice(0, bulletCount))}

## Next Steps
1. Circulate this draft for feedback
2. Confirm scope and success metrics
3. Schedule the first checkpoint review`;
  }
}
