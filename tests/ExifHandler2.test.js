// c:\Users\safet\Projekte-Software\electron-panes\js\ExifHandler.calcTimeMeanAndStdDev.test.js
// Tests for calcTimeMeanAndStdDev using Jest

import { calcTimeMeanAndStdDev } from '../js/ExifHandler.js';


describe('calcTimeMeanAndStdDev', () => {
  test('returns null mean and stdDev when imagesSubset is empty', () => {

    // Arrange
    const imagesSubset = [];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(result).toEqual({ mean: null, maxDev: null, date: null });
  });
  
  test('ignores entries that cannot be converted to timestamps (null DateTimeOriginal)', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: null },
      { DateTimeOriginal: undefined },
      { DateTimeOriginal: 12345 }, // non-string, non-object
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(result).toEqual({ mean: null, maxDev: null, date: null });
  });
  
  test('handles single string DateTimeOriginal and returns zero stdDev and date (maxDeviation === 0)', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: '2025:01:02 03:04:05' },
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(typeof result.mean).toBe('string'); // ISO string
    expect(result.mean.startsWith('2025-01-02T03:04:05')).toBe(true);
    expect(result.maxDev).toBe('0.000 seconds');
    expect(result.date).toBeTruthy(); // some locale date string
  });

  test('handles multiple string DateTimeOriginal values within 24h and returns date', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: '2025:01:02 00:00:00' },
      { DateTimeOriginal: '2025:01:02 12:00:00' }, // 12h later, deviation < 24h
      { DateTimeOriginal: '2025:01:02 23:59:59' }, // almost 24h later
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(typeof result.mean).toBe('string');
    // mean will be on that day, so locale date should be that date (approx check)
    expect(result.date).toBeTruthy();
    // maxDev should be less than 86400 seconds
    const numericMaxDev = parseFloat(result.maxDev);
    expect(numericMaxDev).toBeLessThan(86400);
  });

  test('handles object DateTimeOriginal with timezone offset and returns consistent mean', () => {

    // Arrange
    // Two times that represent the same absolute moment:
    // 2025-01-02 03:00 UTC and 2025-01-02 04:00 local with tzoffsetMinutes = 60
    const imagesSubset = [
      {
        DateTimeOriginal: {
          year: 2025,
          month: 1,
          day: 2,
          hour: 3,
          minute: 0,
          second: 0,
          tzoffsetMinutes: 0,
        },
      },
      {
        DateTimeOriginal: {
          year: 2025,
          month: 1,
          day: 2,
          hour: 4,
          minute: 0,
          second: 0,
          tzoffsetMinutes: 60, // local time is +1h, but offset brings it back to same UTC
        },
      },
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    // Mean should be the same absolute timestamp, so stdDev should be 0
    expect(result.maxDev).toBe('0.000 seconds');
    expect(result.date).toBeTruthy();
    expect(result.mean).toMatch(/^2025-01-02T0[3-4]:/); // around that time in ISO form
  });

  test('object DateTimeOriginal without hour/minute/second defaults them to zero', () => {

    // Arrange
    const imagesSubset = [
      {
        DateTimeOriginal: { year: 2025, month: 1, day: 2 }, // should default to 00:00:00
      },
      {
        DateTimeOriginal: { year: 2025, month: 1, day: 2, hour: 0, minute: 0, second: 0 },
      },
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(result.maxDev).toBe('0.000 seconds');
    expect(result.date).toBeTruthy();
  });
  
  test('mixed valid and invalid entries: invalid ones are ignored', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: '2025:01:02 00:00:00' },
      { DateTimeOriginal: 'invalid-format' }, // will convert to NaN timestamp
      { DateTimeOriginal: { year: 2025, month: 1, day: 2, hour: 1, minute: 0, second: 0 } },
      { DateTimeOriginal: 12345 }, // ignored
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    // We expect at least two valid timestamps, so mean should be non-null
    expect(result.mean).toBe("2025-01-02T00:30:00.000Z");
    expect(result.maxDev).toBe("1800.000 seconds");
    expect(result.date).toBe("2.1.2025");
  });
  
  test('if maxDeviation is >= 86400 seconds (>=24h) date is null', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: '2025:01:01 00:00:00' },
      { DateTimeOriginal: '2025:01:03 00:01:00' }, // a bit more than 24h apart
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    const numericMaxDev = parseFloat(result.maxDev);
    expect(numericMaxDev).toBeGreaterThanOrEqual(86400);
    expect(result.date).toBeNull();
  });
  
  test('handles case where timestamps array has length 1 and still computes mean and maxDev correctly', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: { year: 2030, month: 12, day: 31, hour: 23, minute: 59, second: 59 } },
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(typeof result.mean).toBe('string');
    expect(result.maxDev).toBe('0.000 seconds');
    expect(result.date).toBeTruthy();
  });

  test('ignores non-object and non-string DateTimeOriginal (e.g. boolean) and returns null mean/stdDev if no valid timestamps', () => {

    // Arrange
    const imagesSubset = [
      { DateTimeOriginal: true },
      { DateTimeOriginal: false },
    ];

    // Act
    const result = calcTimeMeanAndStdDev(imagesSubset);

    // Assert
    expect(result).toEqual({ mean: null, maxDev: null, date: null });
  });
});
