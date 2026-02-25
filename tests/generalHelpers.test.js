import { validateAndSanitizeMetadataJSON } from '../js/generalHelpers.js';

describe('validateAndSanitizeMetadataJSON', () => {
  test('returns sanitized object for valid JSON string', () => {
    const input = JSON.stringify({
      Title: 'A nice title',
      Description: 'Some description',
      Keywords: 'one, two, three'
    });

    const out = validateAndSanitizeMetadataJSON(input);

    expect(out).not.toBeNull();
    expect(out.Title).toBe('A nice title');
    expect(out.Description).toBe('Some description');
    expect(out.Keywords).toBe('one, two, three');
  });

  test('rejects non-string input', () => {
    expect(validateAndSanitizeMetadataJSON(null)).toBeNull();
    expect(validateAndSanitizeMetadataJSON({})).toBeNull();
  });

  test('rejects JSON with extra or missing keys', () => {
    const extra = JSON.stringify({ Title: 't', Description: 'd', Keywords: 'k', Extra: 'x' });
    const missing = JSON.stringify({ Title: 't', Description: 'd' });

    expect(validateAndSanitizeMetadataJSON(extra)).toBeNull();
    expect(validateAndSanitizeMetadataJSON(missing)).toBeNull();
  });

  test('sanitizes malicious values and strips control chars and long input', () => {
    const malicious = {
      Title: '<script>alert(1)</script>Title',
      Description: 'Desc\u0001 with control\n' + 'x'.repeat(3000),
      Keywords: '<img src=x onerror=alert(2)>kw'
    };

    const input = JSON.stringify(malicious);
    const out = validateAndSanitizeMetadataJSON(input);

    expect(out).not.toBeNull();
    
    expect(out.Title).toMatch(/Title$/);
    expect(out.Title).not.toMatch(/script/i);

    expect(out.Description).not.toMatch(/\u0001/);
    expect(out.Description.length).toBeLessThanOrEqual(2000);

    expect(out.Keywords).toMatch(/kw$/);
    expect(out.Keywords).not.toMatch(/<img|onerror/i);
    
  });

  test('handles responses that contain markdown/code fences and extra text', () => {
    const wrapped = "Here is the metadata:\n```json\n{\"Title\":\"T\",\"Description\":\"D\",\"Keywords\":\"K\"}\n```\nThanks";
    const out = validateAndSanitizeMetadataJSON(wrapped);
    expect(out).not.toBeNull();
    expect(out.Title).toBe('T');
  });
});
