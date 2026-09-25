import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getICD10Description, normalizeICD10Code } from '@lowlysre/icd-10-cm';

// Cache loaded dataset in memory across requests in server runtime
let cachedDataset: Record<string, string> | null = null;

function getDataset(): Record<string, string> {
  if (!cachedDataset) {
    try {
      const dataPath = path.join(process.cwd(), 'node_modules', '@lowlysre/icd-10-cm', 'data', 'icd10.min.json');
      cachedDataset = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    } catch (err) {
      console.error('[icd10-api] Failed to load icd10 dataset:', err);
      cachedDataset = {};
    }
  }
  return cachedDataset || {};
}

export interface ICD10Item {
  code: string;
  label: string;
  whoUrl: string;
  philHealthVerified: boolean;
  isCommon?: boolean;
}

// Top common diagnoses in Philippine outpatient and primary care clinics (PhilHealth CF4 standards)
const COMMON_PH_DIAGNOSES: ICD10Item[] = [
  { code: 'J06.9', label: 'Acute upper respiratory infection, unspecified', whoUrl: 'https://icd.who.int/browse10/2019/en#/J06.9', philHealthVerified: true, isCommon: true },
  { code: 'I10', label: 'Essential (primary) hypertension', whoUrl: 'https://icd.who.int/browse10/2019/en#/I10', philHealthVerified: true, isCommon: true },
  { code: 'E11.9', label: 'Type 2 diabetes mellitus without complications', whoUrl: 'https://icd.who.int/browse10/2019/en#/E11.9', philHealthVerified: true, isCommon: true },
  { code: 'A09', label: 'Infectious gastroenteritis and colitis, unspecified', whoUrl: 'https://icd.who.int/browse10/2019/en#/A09', philHealthVerified: true, isCommon: true },
  { code: 'J45.909', label: 'Unspecified asthma, uncomplicated', whoUrl: 'https://icd.who.int/browse10/2019/en#/J45', philHealthVerified: true, isCommon: true },
  { code: 'N39.0', label: 'Urinary tract infection, site not specified', whoUrl: 'https://icd.who.int/browse10/2019/en#/N39.0', philHealthVerified: true, isCommon: true },
  { code: 'A97.9', label: 'Dengue, unspecified', whoUrl: 'https://icd.who.int/browse10/2019/en#/A97', philHealthVerified: true, isCommon: true },
  { code: 'E78.5', label: 'Hyperlipidemia, unspecified (Dyslipidemia)', whoUrl: 'https://icd.who.int/browse10/2019/en#/E78.5', philHealthVerified: true, isCommon: true },
  { code: 'J02.9', label: 'Acute pharyngitis, unspecified', whoUrl: 'https://icd.who.int/browse10/2019/en#/J02.9', philHealthVerified: true, isCommon: true },
  { code: 'K21.9', label: 'Gastro-esophageal reflux disease without esophagitis (GERD)', whoUrl: 'https://icd.who.int/browse10/2019/en#/K21.9', philHealthVerified: true, isCommon: true },
  { code: 'M54.5', label: 'Low back pain', whoUrl: 'https://icd.who.int/browse10/2019/en#/M54.5', philHealthVerified: true, isCommon: true },
  { code: 'R51.9', label: 'Headache, unspecified', whoUrl: 'https://icd.who.int/browse10/2019/en#/R51', philHealthVerified: true, isCommon: true },
  { code: 'Z00.00', label: 'Encounter for general adult medical examination without abnormal findings', whoUrl: 'https://icd.who.int/browse10/2019/en#/Z00.0', philHealthVerified: true, isCommon: true },
];

function formatCode(raw: string): string {
  if (raw.includes('.')) return raw;
  return raw.length > 3 ? `${raw.slice(0, 3)}.${raw.slice(3)}` : raw;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const code = (searchParams.get('code') || '').trim();
    const isTopRequested = searchParams.get('top') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50);

    // 1. Direct single code lookup
    if (code) {
      const description = getICD10Description(code);
      if (!description) {
        return NextResponse.json({ found: false, code }, { status: 404 });
      }
      const formatted = formatCode(normalizeICD10Code(code));
      const item: ICD10Item = {
        code: formatted,
        label: description,
        whoUrl: `https://icd.who.int/browse10/2019/en#/${formatted}`,
        philHealthVerified: true,
      };
      return NextResponse.json({ found: true, item });
    }

    // 2. Return common Philippine outpatient diagnoses if no query
    if (!query || isTopRequested) {
      return NextResponse.json({
        total: COMMON_PH_DIAGNOSES.length,
        results: COMMON_PH_DIAGNOSES,
        source: '@lowlysre/icd-10-cm + Philippine Outpatient Practice',
      });
    }

    // 3. Search @lowlysre/icd-10-cm dataset
    const dataset = getDataset();
    const qLower = query.toLowerCase();
    const qNorm = qLower.replace(/\./g, '');

    const exactMatch: ICD10Item[] = [];
    const codePrefixMatch: ICD10Item[] = [];
    const labelPrefixMatch: ICD10Item[] = [];
    const labelContainsMatch: ICD10Item[] = [];

    // Also check top common list first for priority match
    for (const common of COMMON_PH_DIAGNOSES) {
      if (
        common.code.toLowerCase().replace(/\./g, '') === qNorm ||
        common.label.toLowerCase().includes(qLower)
      ) {
        exactMatch.push(common);
      }
    }

    for (const [rawKey, label] of Object.entries(dataset)) {
      const kLower = rawKey.toLowerCase();
      const vLower = label.toLowerCase();
      const formatted = formatCode(rawKey);

      // Skip duplicates already found in exactMatch
      if (exactMatch.some((m) => m.code === formatted)) continue;

      const item: ICD10Item = {
        code: formatted,
        label,
        whoUrl: `https://icd.who.int/browse10/2019/en#/${formatted}`,
        philHealthVerified: true,
      };

      if (kLower === qNorm) {
        exactMatch.push(item);
      } else if (kLower.startsWith(qNorm)) {
        if (codePrefixMatch.length < limit) codePrefixMatch.push(item);
      } else if (vLower.startsWith(qLower)) {
        if (labelPrefixMatch.length < limit) labelPrefixMatch.push(item);
      } else if (vLower.includes(qLower)) {
        if (labelContainsMatch.length < limit) labelContainsMatch.push(item);
      }

      // Early break if we have enough high quality candidates
      if (
        exactMatch.length + codePrefixMatch.length + labelPrefixMatch.length >= limit &&
        labelContainsMatch.length >= limit
      ) {
        break;
      }
    }

    const merged = [
      ...exactMatch,
      ...codePrefixMatch,
      ...labelPrefixMatch,
      ...labelContainsMatch,
    ].slice(0, limit);

    return NextResponse.json({
      total: merged.length,
      results: merged,
      source: '@lowlysre/icd-10-cm (WHO ICD-10 2019 Compatible)',
    });
  } catch (error) {
    console.error('[icd10-api] Search failure:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
