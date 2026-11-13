import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

const DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

describe('loadConfig', () => {
  it('returns the database URL from the environment', () => {
    expect(loadConfig({ DATABASE_URL }).databaseUrl).toBe(DATABASE_URL);
  });

  it('trims surrounding whitespace', () => {
    expect(loadConfig({ DATABASE_URL: '  postgresql://localhost/db \n' }).databaseUrl).toBe(
      'postgresql://localhost/db',
    );
  });

  it.each([undefined, '', '   '])('throws a helpful error when DATABASE_URL is %j', (value) => {
    expect(() => loadConfig({ DATABASE_URL: value })).toThrow(/DATABASE_URL is not set/);
  });

  describe('port', () => {
    it('defaults to 3000', () => {
      expect(loadConfig({ DATABASE_URL }).port).toBe(3000);
    });

    it('uses PORT when it is set', () => {
      expect(loadConfig({ DATABASE_URL, PORT: '4100' }).port).toBe(4100);
    });

    it.each(['abc', '0', '70000', '-1', '30.5'])('rejects the invalid PORT "%s"', (value) => {
      expect(() => loadConfig({ DATABASE_URL, PORT: value })).toThrow(/PORT must be/);
    });
  });

  describe('secureCookies', () => {
    it('is on only in production', () => {
      expect(loadConfig({ DATABASE_URL, NODE_ENV: 'production' }).secureCookies).toBe(true);
      expect(loadConfig({ DATABASE_URL, NODE_ENV: 'development' }).secureCookies).toBe(false);
      expect(loadConfig({ DATABASE_URL }).secureCookies).toBe(false);
    });
  });

  describe('trustProxyHops', () => {
    it('defaults to 0', () => {
      expect(loadConfig({ DATABASE_URL }).trustProxyHops).toBe(0);
    });

    it('uses TRUST_PROXY when it is set', () => {
      expect(loadConfig({ DATABASE_URL, TRUST_PROXY: '2' }).trustProxyHops).toBe(2);
    });

    it.each(['abc', '-1', '6', '1.5'])('rejects the invalid TRUST_PROXY "%s"', (value) => {
      expect(() => loadConfig({ DATABASE_URL, TRUST_PROXY: value })).toThrow(/TRUST_PROXY must be/);
    });
  });

  describe('publicUrl', () => {
    it('defaults to the local frontend', () => {
      expect(loadConfig({ DATABASE_URL }).publicUrl).toBe('http://localhost:5173');
    });

    it.each([
      ['https://skola.example.com', 'https://skola.example.com'],
      ['https://skola.example.com/', 'https://skola.example.com'],
      ['  https://skola.example.com///  ', 'https://skola.example.com'],
      ['https://example.com/app/', 'https://example.com/app'],
    ])('turns "%s" into "%s"', (value, expected) => {
      expect(loadConfig({ DATABASE_URL, PUBLIC_URL: value }).publicUrl).toBe(expected);
    });

    it.each(['skola.example.com', 'ftp://example.com', 'not a url'])(
      'rejects the invalid PUBLIC_URL "%s"',
      (value) => {
        expect(() => loadConfig({ DATABASE_URL, PUBLIC_URL: value })).toThrow(/PUBLIC_URL must/);
      },
    );
  });
  describe('aiProvider', () => {
    it('defaults to the fake AI', () => {
      expect(loadConfig({ DATABASE_URL }).aiProvider).toBe('fake');
      expect(loadConfig({ DATABASE_URL, AI_PROVIDER: '  ' }).aiProvider).toBe('fake');
    });

    it('uses AI_PROVIDER when it names a known service', () => {
      expect(loadConfig({ DATABASE_URL, AI_PROVIDER: 'fake' }).aiProvider).toBe('fake');
    });

    it('uses groq when it has a key, and asks for the key when it has none', () => {
      const config = loadConfig({
        DATABASE_URL,
        AI_PROVIDER: 'groq',
        GROQ_API_KEY: '  not-a-real-key  ',
      });

      expect(config.aiProvider).toBe('groq');
      expect(config.aiApiKey).toBe('not-a-real-key');
      expect(() => loadConfig({ DATABASE_URL, AI_PROVIDER: 'groq' })).toThrow(
        /GROQ_API_KEY is not set/,
      );
      expect(() => loadConfig({ DATABASE_URL, AI_PROVIDER: 'groq', GROQ_API_KEY: '   ' })).toThrow(
        /GROQ_API_KEY is not set/,
      );
    });

    it('does not need a key for the fake AI, and leaves an unset key and model empty', () => {
      const config = loadConfig({ DATABASE_URL });

      expect(config.aiApiKey).toBeUndefined();
      expect(config.aiModel).toBeUndefined();
    });

    it('reads the name of the model, and refuses something that is not a name', () => {
      expect(loadConfig({ DATABASE_URL, AI_MODEL: ' openai/gpt-oss-120b ' }).aiModel).toBe(
        'openai/gpt-oss-120b',
      );
      expect(loadConfig({ DATABASE_URL, AI_MODEL: '  ' }).aiModel).toBeUndefined();
      expect(() => loadConfig({ DATABASE_URL, AI_MODEL: 'a model; drop table' })).toThrow(
        /AI_MODEL must be the name of a model/,
      );
    });

    it('refuses a service the server does not know, and names the ones it does', () => {
      expect(() => loadConfig({ DATABASE_URL, AI_PROVIDER: 'skynet' })).toThrow(
        /AI_PROVIDER must be one of: fake, groq\. Got "skynet"/,
      );
    });
  });
});
