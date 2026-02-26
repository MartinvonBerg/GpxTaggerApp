import { reverseGeocodeToXmp, clearReverseGeocodeCache } from '../js/nominatim.js';
import { jest } from '@jest/globals';

describe("reverseGeocodeToXmp", () => {

  const baseOptions = {
    userAgent: "MyPhotoApp/1.0 (test@example.com)",
    rateLimit: false,   // disable for test speed
    cache: false
  };

  beforeEach(() => {
    clearReverseGeocodeCache();
    global.fetch = jest.fn();
  });

  test("maps city correctly", async () => {
    mockResponse({
      address: {
        city: "Berlin",
        state: "Berlin",
        country: "Deutschland",
        country_code: "de"
      }
    });

    const result = await reverseGeocodeToXmp(52.5, 13.4, baseOptions);

    expect(result).toEqual({
      City: "Berlin",
      "Province-State": "Berlin",
      Country: "Deutschland",
      CountryCode: "DE"
    });
  });

  test("fallback city → town", async () => {
    mockResponse({
      address: {
        town: "Potsdam",
        state: "Brandenburg",
        country: "Deutschland"
      }
    });

    const result = await reverseGeocodeToXmp(52, 13, baseOptions);

    expect(result.City).toBe("Potsdam");
  });

  test("fallback city → village", async () => {
    mockResponse({
      address: {
        village: "Grassau",
        state: "Bayern",
        country: "Deutschland"
      }
    });

    const result = await reverseGeocodeToXmp(47, 12, baseOptions);

    expect(result.City).toBe("Grassau");
  });

  test("fallback state → region", async () => {
    mockResponse({
      address: {
        city: "Nice",
        region: "Provence-Alpes-Côte d'Azur",
        country: "France"
      }
    });

    const result = await reverseGeocodeToXmp(43, 7, baseOptions);

    expect(result["Province-State"]).toBe("Provence-Alpes-Côte d'Azur");
  });

  test("countryCode uppercase", async () => {
    mockResponse({
      address: {
        city: "Rome",
        state: "Lazio",
        country: "Italy",
        country_code: "it"
      }
    });

    const result = await reverseGeocodeToXmp(41, 12, baseOptions);

    expect(result.CountryCode).toBe("IT");
  });

  test("handles missing countryCode", async () => {
    mockResponse({
      address: {
        city: "Vienna",
        state: "Wien",
        country: "Austria"
      }
    });

    const result = await reverseGeocodeToXmp(48, 16, baseOptions);

    expect(result.CountryCode).toBeUndefined();
  });

  test("returns empty fields if address empty", async () => {
    mockResponse({});

    const result = await reverseGeocodeToXmp(0, 0, baseOptions);

    expect(result).toEqual({
      City: "",
      "Province-State": "",
      Country: ""
    });
  });

  test("throws if coordinates invalid", async () => {
    await expect(
      reverseGeocodeToXmp("x", 13, baseOptions)
    ).rejects.toThrow();
  });
  /*
  test("throws if userAgent missing", async () => {
    await expect(
      reverseGeocodeToXmp(52, 13, { rateLimit: false })
    ).rejects.toThrow("User-Agent");
  });
    */
  test("uses cache when enabled", async () => {
    mockResponse({
      address: {
        city: "Berlin",
        state: "Berlin",
        country: "Deutschland"
      }
    });

    const options = {
      ...baseOptions,
      cache: true,
      cachePrecision: 4
    };

    const first = await reverseGeocodeToXmp(52.5, 13.4, options);
    const second = await reverseGeocodeToXmp(52.5000001, 13.4000001, options);

    expect(first).toEqual(second);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

});

/* ---------------- Helper ---------------- */

function mockResponse(json) {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => json
  });
}