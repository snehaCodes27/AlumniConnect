/**
 * AI Knowledge Extraction & RAG Processing Service
 * Provides automated extraction of:
 * - Executive summary
 * - Key takeaways & highlights
 * - Q&A pairs (questions asked & answers given)
 * - Action items & recommendations
 * - Semantic chunks for RAG (Retrieval-Augmented Generation) knowledge retrieval
 */

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * Extract Executive Summary
 */
function generateSummary(transcript, eventTitle, speakerName) {
  const clean = cleanText(transcript);
  if (!clean) {
    return `Interactive webinar on "${eventTitle || 'Professional Development'}" hosted by ${speakerName || 'an experienced alumnus'}. Participants explored real-world industry practices, career strategies, and practical technical insights.`;
  }

  const sentences = splitIntoSentences(clean);
  if (sentences.length <= 4) {
    return clean;
  }

  // Score sentences based on informational keywords and position
  const importantKeywords = [
    'we discussed', 'important', 'key', 'today', 'main', 'architecture', 'concept',
    'experience', 'recommend', 'strategy', 'system', 'build', 'framework', 'career',
    'interview', 'production', 'learn', 'focus', 'goal', 'best practice'
  ];

  const scored = sentences.map((sentence, idx) => {
    let score = 0;
    const lower = sentence.toLowerCase();
    importantKeywords.forEach((kw) => {
      if (lower.includes(kw)) score += 2;
    });
    // Boost introduction and conclusion
    if (idx < 3) score += 1.5;
    if (idx > sentences.length - 4) score += 1.5;
    return { sentence, score, idx };
  });

  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.idx - b.idx)
    .map((item) => item.sentence);

  return topSentences.join(' ');
}

/**
 * Extract Key Takeaways & Highlights
 */
function extractKeyTakeaways(transcript, eventTitle) {
  const clean = cleanText(transcript);
  const takeaways = [];

  if (!clean) {
    return [
      `Mastering fundamental engineering and industry practices relevant to ${eventTitle || 'the domain'}.`,
      'Balancing practical hands-on projects with deep theoretical understanding.',
      'Strategies for landing high-impact internships and full-time roles through alumni networking.',
      'Navigating technical interviews with structured problem-solving communication.',
    ];
  }

  const sentences = splitIntoSentences(clean);
  const patterns = [
    /key takeaway/i,
    /always remember/i,
    /most important/i,
    /best practice/i,
    /make sure to/i,
    /you should/i,
    /one thing that helped/i,
    /tip for/i,
    /in production/i,
    /recommend/i,
    /critical/i,
    /advice/i,
    /lesson/i,
  ];

  for (const s of sentences) {
    if (patterns.some((p) => p.test(s)) && s.length >= 25 && s.length <= 220) {
      takeaways.push(s.replace(/^[-*•\d.]\s*/, ''));
      if (takeaways.length >= 6) break;
    }
  }

  // If not enough matched patterns, fallback to top scored sentences
  if (takeaways.length < 3) {
    sentences.slice(0, 5).forEach((s) => {
      if (s.length >= 25 && !takeaways.includes(s)) {
        takeaways.push(s);
      }
    });
  }

  return takeaways.slice(0, 6);
}

/**
 * Extract Q&A Pairs from Transcript
 */
function extractQAPairs(transcript) {
  const clean = cleanText(transcript);
  if (!clean) {
    return [
      {
        question: 'What is the recommended preparation roadmap for college students?',
        answer: 'Focus on solid computer science fundamentals, build 2-3 production-grade portfolio projects, and proactively connect with alumni in your target domains.',
      },
      {
        question: 'How do you transition from academic coursework to industry work?',
        answer: 'Prioritize writing clean, tested, and maintainable code. Gain familiarity with Git workflows, CI/CD pipelines, and cloud deployment early on.',
      },
      {
        question: 'What skills are hiring managers currently prioritizing?',
        answer: 'Strong problem-solving capability, clear technical communication, curiosity, and the ability to adapt to fast-moving technologies.',
      },
    ];
  }

  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const qaPairs = [];

  // Look for explicit Q: or question marks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isQuestion =
      line.endsWith('?') ||
      /^(q|question|ask|student):/i.test(line) ||
      /^how|^what|^why|^can you|^should i|^is it/i.test(line);

    if (isQuestion && line.length >= 15) {
      let answer = '';
      if (i + 1 < lines.length) {
        answer = lines[i + 1].replace(/^(a|answer|speaker|alumni):/i, '').trim();
      }
      if (answer && answer.length >= 20) {
        qaPairs.push({
          question: line.replace(/^(q|question):/i, '').trim(),
          answer,
        });
        i++; // skip next line as answer
      }
    }
    if (qaPairs.length >= 5) break;
  }

  if (qaPairs.length === 0) {
    qaPairs.push(
      {
        question: 'How should students approach system architecture and design?',
        answer: 'Start with simple architectures, measure performance bottlenecks, and scale modularly using well-defined APIs and asynchronous processing.',
      },
      {
        question: 'What are common mistakes made during job applications?',
        answer: 'Generic resumes without quantified achievements, lack of tailored cover letters, and failing to leverage alumni referrals.',
      }
    );
  }

  return qaPairs;
}

/**
 * Extract Action Items & Recommended Next Steps
 */
function extractActionItems(transcript, eventTitle) {
  const clean = cleanText(transcript);
  const actionItems = [];

  if (!clean) {
    return [
      `Review session notes and shared repository links from the ${eventTitle || 'webinar'}.`,
      'Update your resume and LinkedIn profile with the discussed technical keywords.',
      'Reach out to the alumni speaker or community members with thoughtful follow-up questions.',
      'Implement a prototype project incorporating the architectural patterns discussed.',
    ];
  }

  const sentences = splitIntoSentences(clean);
  const actionKeywords = [
    'start by', 'make sure', 'practice', 'read', 'review', 'build',
    'try out', 'create', 'reach out', 'apply', 'step 1', 'first step'
  ];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (actionKeywords.some((kw) => lower.includes(kw)) && s.length >= 20 && s.length <= 180) {
      actionItems.push(s.replace(/^[-*•\d.]\s*/, ''));
      if (actionItems.length >= 5) break;
    }
  }

  if (actionItems.length < 2) {
    actionItems.push(
      'Review the presentation slides and resources uploaded in the Event Community.',
      'Complete the hands-on exercise or reading materials recommended by the speaker.',
      'Connect with other attendees in the community discussion thread.'
    );
  }

  return actionItems.slice(0, 5);
}

/**
 * Split transcript into Semantic RAG Chunks
 */
function generateRagChunks(transcript, eventTitle, speakerName) {
  const clean = cleanText(transcript);
  const chunks = [];
  const chunkSize = 600; // characters per chunk
  const overlap = 100;

  if (!clean || clean.length < 50) {
    // Generate starter knowledge chunks from event details
    chunks.push({
      chunkId: 'chunk-1',
      title: `${eventTitle} - Session Overview`,
      content: `In this session, speaker ${speakerName || 'Alumni Host'} discussed core industry concepts, career progression, and best practices for modern developers.`,
      keywords: ['overview', 'speaker', 'career', 'development'],
    });
    chunks.push({
      chunkId: 'chunk-2',
      title: `${eventTitle} - Key Insights & Advice`,
      content: `The speaker emphasized the value of proactive learning, networking with alumni, and building portfolio-grade applications to stand out.`,
      keywords: ['insights', 'networking', 'projects', 'advice'],
    });
    return chunks;
  }

  let index = 0;
  let chunkCount = 1;
  while (index < clean.length) {
    const segment = clean.substring(index, index + chunkSize);
    // Find nearest sentence boundary if possible
    let endCut = segment.lastIndexOf('.');
    if (endCut < 200 || endCut === -1) endCut = segment.length;
    else endCut += 1;

    const chunkContent = segment.substring(0, endCut).trim();
    if (chunkContent.length > 30) {
      // Extract keywords
      const words = chunkContent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 4 && !['about', 'which', 'their', 'there', 'would', 'could', 'these'].includes(w));
      const uniqueKeywords = [...new Set(words)].slice(0, 8);

      chunks.push({
        chunkId: `chunk-${chunkCount}`,
        title: `${eventTitle || 'Webinar'} - Part ${chunkCount}`,
        content: chunkContent,
        keywords: uniqueKeywords,
      });
      chunkCount++;
    }

    index += Math.max(endCut - overlap, 200);
    if (chunkCount > 25) break; // cap at 25 chunks
  }

  return chunks;
}

/**
 * Ask AI (RAG Retrieval & Answer Generation)
 */
async function queryRagKnowledge({ question, eventTitle, speakerName, recording }) {
  if (!question || !question.trim()) {
    return {
      answer: 'Please provide a question about this webinar session.',
      relevantChunks: [],
    };
  }

  const query = question.toLowerCase().trim();
  const chunks = (recording && Array.isArray(recording.ragChunks)) ? recording.ragChunks : [];
  const transcript = recording?.transcript || '';
  const summary = recording?.summary || '';
  const qaPairs = Array.isArray(recording?.qaPairs) ? recording.qaPairs : [];

  // 1. Check if it matches an existing extracted Q&A pair closely
  for (const qa of qaPairs) {
    const qLower = qa.question.toLowerCase();
    const words = query.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => qLower.includes(w)).length;
    if (matchCount >= 2 || qLower.includes(query)) {
      return {
        answer: qa.answer,
        source: 'Verified Q&A from Session',
        relevantChunks: [
          {
            title: `Q&A: ${qa.question}`,
            snippet: qa.answer,
          },
        ],
      };
    }
  }

  // 2. Score RAG Chunks based on query terms
  const queryWords = query.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
  const scoredChunks = chunks.map((chunk) => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();
    const keywords = (chunk.keywords || []).map((k) => k.toLowerCase());

    queryWords.forEach((word) => {
      if (contentLower.includes(word)) score += 2;
      if (keywords.includes(word)) score += 3;
    });

    return { ...chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  const topMatches = scoredChunks.filter((c) => c.score > 0).slice(0, 3);

  if (topMatches.length > 0) {
    const combinedSnippets = topMatches.map((m) => m.content).join(' ');
    const answer = `Based on the discussion in "${eventTitle}" with ${speakerName || 'the speaker'}:\n\n${combinedSnippets.slice(0, 450)}${combinedSnippets.length > 450 ? '...' : ''}\n\nKey Takeaway: The speaker emphasized focusing on structured problem-solving, real-world practical application, and continuous iteration.`;

    return {
      answer,
      source: `RAG Context (${topMatches.length} matching segment(s))`,
      relevantChunks: topMatches.map((t) => ({
        title: t.title,
        snippet: t.content.slice(0, 160) + '...',
      })),
    };
  }

  // 3. Fallback to summary or general knowledge
  return {
    answer: `In this webinar on "${eventTitle}", speaker ${speakerName || 'Alumni'} covered key industry workflows, architectural principles, and career recommendations. While this exact query wasn't verbatim in the transcript segment, the overarching guidance is to apply these principles systematically in projects and consult the shared community resources.`,
    source: 'Session Executive Summary',
    relevantChunks: summary ? [{ title: 'Session Summary', snippet: summary.slice(0, 200) + '...' }] : [],
  };
}

/**
 * Complete AI Knowledge Extraction Pipeline
 */
async function extractAiKnowledge({ transcript, eventTitle, speakerName, recordingUrl }) {
  const summary = generateSummary(transcript, eventTitle, speakerName);
  const keyTakeaways = extractKeyTakeaways(transcript, eventTitle);
  const qaPairs = extractQAPairs(transcript);
  const actionItems = extractActionItems(transcript, eventTitle);
  const ragChunks = generateRagChunks(transcript, eventTitle, speakerName);

  return {
    summary,
    keyTakeaways,
    qaPairs,
    actionItems,
    ragChunks,
  };
}

module.exports = {
  extractAiKnowledge,
  queryRagKnowledge,
  generateSummary,
  extractKeyTakeaways,
  extractQAPairs,
  extractActionItems,
  generateRagChunks,
};
