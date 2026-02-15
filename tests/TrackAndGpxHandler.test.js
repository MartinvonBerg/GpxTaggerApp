// c:\Users\safet\Projekte-Software\electron-panes\js\TrackAndGpsHandler.dmsToDecimal.test.js
// Tests for dmsToDecimal using Jest

import { dmsToDecimal } from '../js/TrackAndGpsHandler.js';

describe('dmsToDecimal', () => {
  test('converts N hemisphere DMS to positive decimal degrees', () => {

    // Arrange
    const dmsStr = '40 26 46';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 40 + 26 / 60 + 46 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });

  test('converts E hemisphere DMS to positive decimal degrees', () => {

    // Arrange
    const dmsStr = '79 58 56';
    const ref = 'E';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 79 + 58 / 60 + 56 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });

  test('converts S hemisphere DMS to negative decimal degrees', () => {

    // Arrange
    const dmsStr = '12 34 56';
    const ref = 'S';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = -(12 + 34 / 60 + 56 / 3600);
    expect(result).toBeCloseTo(expected, 10);
  });

  test('converts W hemisphere DMS to negative decimal degrees', () => {

    // Arrange
    const dmsStr = '123 45 6';
    const ref = 'W';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = -(123 + 45 / 60 + 6 / 3600);
    expect(result).toBeCloseTo(expected, 10);
  });

  test('does not negate value for lowercase ref "s" or "w" (only capital S/W)', () => {

    // Arrange
    const dmsStr = '10 20 30';
    const refLowerS = 's';
    const refLowerW = 'w';

    // Act
    const resultS = dmsToDecimal(dmsStr, refLowerS);
    const resultW = dmsToDecimal(dmsStr, refLowerW);

    // Assert
    const expected = 10 + 20 / 60 + 30 / 3600;
    expect(resultS).toBeCloseTo(expected, 10);
    expect(resultW).toBeCloseTo(expected, 10);
  });

  test('handles extra whitespace in DMS string', () => {

    // Arrange
    const dmsStr = '   10   20   30   ';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 10 + 20 / 60 + 30 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });

  test('handles zero minutes and seconds correctly', () => {

    // Arrange
    const dmsStr = '51 0 0';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    expect(result).toBe(51);
  });

  test('handles negative degree value in DMS string combined with S/W ref (double negative)', () => {

    // Arrange
    const dmsStr = '-10 20 30';
    const ref = 'S';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    // degree is -10, minutes and seconds positive; ref S multiplies by -1, so sign flips again
    const base = -10 + 20 / 60 + 30 / 3600;
    const expected = -base; // extra negation
    expect(result).toBeCloseTo(expected, 10);
  });

  test('returns NaN when DMS string contains non-numeric parts', () => {

    // Arrange
    const dmsStr = '10 xx 30';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    expect(result).toBeNaN();
  });

  test('returns NaN when DMS string has missing components (e.g. only degrees)', () => {

    // Arrange
    const dmsStr = '10';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    // min and sec become undefined; arithmetic with undefined yields NaN
    expect(result).toBeNaN();
  });

  test('returns NaN when DMS string is empty', () => {

    // Arrange
    const dmsStr = '';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    expect(result).toBeNaN();
  });

  test('returns NaN when DMS string contains only whitespace', () => {

    // Arrange
    const dmsStr = '   ';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    expect(result).toBeNaN();
  });

  test('treats unknown ref (e.g. "X") as positive (no negation)', () => {

    // Arrange
    const dmsStr = '10 20 30';
    const ref = 'X';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 10 + 20 / 60 + 30 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });

  test('works with fractional seconds in DMS string', () => {

    // Arrange
    const dmsStr = '10 20 30.5';
    const ref = 'N';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 10 + 20 / 60 + 30.5 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });

  test('handles large degree values gracefully', () => {

    // Arrange
    const dmsStr = '359 59 59';
    const ref = 'E';

    // Act
    const result = dmsToDecimal(dmsStr, ref);

    // Assert
    const expected = 359 + 59 / 60 + 59 / 3600;
    expect(result).toBeCloseTo(expected, 10);
  });
});
