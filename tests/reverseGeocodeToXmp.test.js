import { reverseGeocodeToXmp, clearReverseGeocodeCache, getReverseGeocodeCacheSize } from '../js/nominatim.js';
import { jest, test } from '@jest/globals';

// Simple fetch mock helper
const makeFetchMock = (address = {}) => {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ address }),
    text: async () => JSON.stringify({ address })
  });
};

describe('reverseGeocodeToXmp2', () => {
  beforeEach(() => {
    // reset global fetch and cache
    clearReverseGeocodeCache();
  });
  //
  // 47.762519, 12.482644 --> Marquartstein, Bavaria, Germany
  test('real API call returns expected structure', async () => {
    const out = await reverseGeocodeToXmp(47.762519, 12.482644 );
    expect(out).toHaveProperty('City', 'Staudach');
    expect(out).toHaveProperty('Province-State', 'Bayern');
    expect(out).toHaveProperty('Country', 'Deutschland');
  });
});

describe('reverseGeocodeToXmp', () => {
  beforeEach(() => {
    // reset global fetch and cache
    global.fetch = undefined;
    clearReverseGeocodeCache();
  });
  
  test('maps City with correct priority (city -> town -> village -> municipality -> hamlet)', async () => {
    const address = { town: 'MyTown', village: 'MyVillage', hamlet: 'MyHamlet' };
    global.fetch = makeFetchMock(address);

    const out = await reverseGeocodeToXmp(48.1, 11.6, { userAgent: 'test-agent' });

    expect(out.City).toBe('MyTown');
    expect(out['Province-State']).toBe('');
    expect(out.Country).toBe('');
  });

  test('prefers city over town and falls back appropriately', async () => {
    const address1 = { city: 'BigCity' };
    global.fetch = makeFetchMock(address1);
    const out1 = await reverseGeocodeToXmp(48.1, 11.6, { userAgent: 'ua' });
    expect(out1.City).toBe('BigCity');

    // now mock a response with village only
    clearReverseGeocodeCache();
    const address2 = { village: 'SmallVillage' };
    global.fetch = makeFetchMock(address2);
    const out2 = await reverseGeocodeToXmp(48.2, 11.7, { userAgent: 'ua' });
    expect(out2.City).toBe('SmallVillage');
  });

  test('maps Province-State from state or region', async () => {
    const address = { region: 'SomeRegion' };
    global.fetch = makeFetchMock(address);
    const out = await reverseGeocodeToXmp(49, 8, { userAgent: 'ua' });
    expect(out['Province-State']).toBe('SomeRegion');

    // if state present, prefer it
    clearReverseGeocodeCache();
    const address2 = { state: 'MyState', region: 'OtherRegion' };
    global.fetch = makeFetchMock(address2);
    const out2 = await reverseGeocodeToXmp(49.1, 8.1, { userAgent: 'ua' });
    expect(out2['Province-State']).toBe('MyState');
  });

  test('maps Country and uppercases CountryCode when present', async () => {
    const address = { country: 'Germany', country_code: 'de' };
    global.fetch = makeFetchMock(address);
    const out = await reverseGeocodeToXmp(52.5, 13.4, { userAgent: 'ua' });
    expect(out.Country).toBe('Germany');
    expect(out.CountryCode).toBe('DE');
  });

  test('does not include CountryCode when not present', async () => {
    const address = { country: 'Noland' };
    global.fetch = makeFetchMock(address);
    const out = await reverseGeocodeToXmp(0.1, 0.2, { userAgent: 'ua' });
    expect(out.Country).toBe('Noland');
    expect(out.CountryCode).toBeUndefined();
  });

  test('sends required headers and optional Referer', async () => {
    const address = { country: 'X' };
    const fetchMock = makeFetchMock(address);
    global.fetch = fetchMock;

    const ua = 'MyTestAgent/1.0 (test@example.com)';
    const ref = 'https://example.test/';
    await reverseGeocodeToXmp(10, 20, { userAgent: ua, referer: ref });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts).toBeDefined();
    expect(opts.headers['User-Agent']).toBe(ua);
    expect(opts.headers['Accept']).toBe('application/json');
    expect(opts.headers['Referer']).toBe(ref);
  });

  test('caches results and avoids duplicate fetches for same grid key', async () => {
    const address = { city: 'CacheCity' };
    const fetchMock = makeFetchMock(address);
    global.fetch = fetchMock;

    const lat = 48.123456;
    const lon = 11.654321;

    const out1 = await reverseGeocodeToXmp(lat, lon, { userAgent: 'ua' });
    const out2 = await reverseGeocodeToXmp(lat, lon, { userAgent: 'ua' });

    expect(out1.City).toBe('CacheCity');
    expect(out2.City).toBe('CacheCity');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getReverseGeocodeCacheSize()).toBeGreaterThanOrEqual(1);

    // clearing cache forces another fetch
    clearReverseGeocodeCache();
    global.fetch = makeFetchMock({ city: 'CacheCity2' });
    const out3 = await reverseGeocodeToXmp(lat, lon, { userAgent: 'ua' });
    expect(out3.City).toBe('CacheCity2');
  });
  
});


