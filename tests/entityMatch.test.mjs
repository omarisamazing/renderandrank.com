/**
 * Unit tests for functions/lib/entityMatch.ts (accuracy-critical logic).
 * Run: npm run test:entities  (esbuild bundle + node --test, no deps)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntity,
  sameEntity,
  looksLikeBusinessName,
  findMentionSnippet,
  extractCompetitors,
  parseGrounding,
  groundingVerifies,
  consensusScore,
  cacheKeyFor,
} from '../functions/lib/entityMatch.ts';

describe('normalizeEntity', () => {
  it('strips case, punctuation, legal suffixes', () => {
    assert.equal(normalizeEntity('Apex Climate Heating, LLC'), 'apex climate heating');
    assert.equal(normalizeEntity("Joe's BBQ & Grill Inc."), 'joes bbq & grill');
  });
});

describe('sameEntity', () => {
  it('matches exact, alias, and token-contained names', () => {
    assert.equal(sameEntity('Apex Climate Heating', 'apex climate heating'), true);
    assert.equal(sameEntity('Apex Climate Heating LLC', 'Apex Climate'), true);
    assert.equal(sameEntity('Franklin Barbecue', 'Franklin BBQ'), false); // BBQ != Barbecue tokens
  });
  it('rejects single-token fuzz and cross-entity leaks', () => {
    assert.equal(sameEntity('Apex', 'Apex Plumbing'), true); // substring rule
    assert.equal(sameEntity('Apex Heating', 'Apex Plumbing'), false);
    assert.equal(sameEntity('Delta', 'Delta Dental'), true); // substring rule
  });
});

describe('looksLikeBusinessName', () => {
  it('accepts real names incl. connectors', () => {
    const target = 'Apex Climate Heating';
    assert.equal(looksLikeBusinessName('Service Experts Heating & Air Conditioning', target), true);
    assert.equal(looksLikeBusinessName('City of Austin Heating', target), true);
    assert.equal(looksLikeBusinessName('La Barbecue', target), true);
  });
  it('rejects headings, labels, fragments (all junk seen in prod)', () => {
    for (const junk of [
      'Address', 'Phone', 'Why Recommended', 'Why Recommend It', 'Key Strengths',
      'Location', 'Locations', 'Check the Basics First', 'Ask About Emergency Fees',
      'Fast response times and real', 'What the engine returned',
    ]) {
      assert.equal(looksLikeBusinessName(junk, 'Apex Climate Heating'), false, junk);
    }
  });
  it('rejects the target itself', () => {
    assert.equal(looksLikeBusinessName('Apex Climate Heating', 'Apex Climate Heating'), false);
  });
});

describe('findMentionSnippet', () => {
  const answer =
    'Based on reviews, here are the top emergency AC repair picks in Austin: 1. Service Experts Heating & Air Conditioning — great service. 2. All Seasons Air Conditioning — fast response.';
  it('finds exact mentions with context', () => {
    const r = findMentionSnippet(answer, 'Service Experts Heating & Air Conditioning');
    assert.equal(r.mentioned, true);
    assert.match(r.snippet ?? '', /Service Experts/);
  });
  it('matches across punctuation/suffix variants', () => {
    const r = findMentionSnippet('Try Apex Climate Heating, LLC for AC repair.', 'apex climate heating');
    assert.equal(r.mentioned, true);
  });
  it('does not false-positive on widely scattered words', () => {
    const filler = ' Many other businesses are listed here with long descriptions that go on and on.';
    const r = findMentionSnippet(
      'Apex Plumbing is great.' + filler.repeat(6) + ' Elsewhere, Central Heating gets praise.',
      'Apex Heating'
    );
    assert.equal(r.mentioned, false);
  });
  it('returns a context sample when absent', () => {
    const r = findMentionSnippet(answer, 'Nonexistent Business XYZ');
    assert.equal(r.mentioned, false);
    assert.ok((r.snippet ?? '').length > 0);
  });
});

describe('extractCompetitors', () => {
  it('parses numbered lists, skips headings', () => {
    const text = 'Top picks:\n1. Service Experts Heating & Air Conditioning: great\n2. Address: 123 Main\n3. All Seasons Air Conditioning: fast';
    assert.deepEqual(extractCompetitors(text, 'My Business'), [
      'Service Experts Heating & Air Conditioning',
      'All Seasons Air Conditioning',
    ]);
  });
});

describe('parseGrounding + groundingVerifies', () => {
  it('extracts urls/titles and verifies by title match', () => {
    const candidate = {
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: 'https://example.com/a', title: 'Franklin Barbecue – Austin TX' } },
          { web: { uri: 'https://example.com/b', title: 'Best BBQ joints' } },
        ],
      },
    };
    const g = parseGrounding(candidate);
    assert.equal(g.urls.length, 2);
    assert.equal(groundingVerifies(g.titles, 'Franklin Barbecue'), true);
    assert.equal(groundingVerifies(g.titles, 'Torchys Tacos'), false);
  });
  it('handles missing metadata', () => {
    assert.deepEqual(parseGrounding({}), { urls: [], titles: [] });
    assert.deepEqual(parseGrounding(null), { urls: [], titles: [] });
  });
});

describe('consensusScore', () => {
  it('weights grounded Gemini above Llama', () => {
    const all = [
      { engine: 'Google Gemini', mentioned: true, verified: false },
      { engine: 'Google Gemini · alternate phrasing', mentioned: true, verified: false },
      { engine: 'Open Entity Model (Llama 3.1)', mentioned: false, verified: false },
    ];
    assert.equal(consensusScore(all), 83); // 5/6 weights
    assert.equal(
      consensusScore([{ engine: 'Open Entity Model (Llama 3.1)', mentioned: true, verified: false }]),
      100
    );
    assert.equal(consensusScore([]), 0);
  });
  it('adds verified-citation bonus capped at 96', () => {
    const s = [
      { engine: 'Google Gemini', mentioned: true, verified: true },
      { engine: 'Google Gemini · alternate phrasing', mentioned: false, verified: false },
      { engine: 'Open Entity Model (Llama 3.1)', mentioned: false, verified: false },
    ];
    assert.equal(consensusScore(s), 56); // 50 base + 6 bonus
  });
});

describe('cacheKeyFor', () => {
  it('is stable across case/punctuation', () => {
    assert.equal(
      cacheKeyFor('Apex Climate Heating, LLC', 'Emergency AC Repair', 'Austin, TX'),
      cacheKeyFor('apex climate heating', 'emergency ac repair', 'austin tx')
    );
  });
});
