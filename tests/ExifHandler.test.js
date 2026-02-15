// c:\Users\safet\Projekte-Software\electron-panes\js\ExifHandler.test.js
// Tests for parseTimeDiffToSeconds using Jest

import { parseTimeDiffToSeconds } from '../js/ExifHandler.js';


describe('parseTimeDiffToSeconds', () => {
  test('parses positive time diff "00:00:00" as 0 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('00:00:00');

    // Assert
    expect(result).toBe(0);
  });

  test('parses positive time diff "00:00:05" as 5 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('00:00:05');

    // Assert
    expect(result).toBe(5);
  });

  test('parses positive time diff "00:01:00" as 60 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('00:01:00');

    // Assert
    expect(result).toBe(60);
  });

  test('parses positive time diff "01:00:00" as 3600 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('01:00:00');

    // Assert
    expect(result).toBe(3600);
  });

  test('parses positive time diff "12:34:56" as correct number of seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('12:34:56');

    // Assert
    expect(result).toBe(12 * 3600 + 34 * 60 + 56);
  });

  test('parses negative time diff "-00:00:05" as -5 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('-00:00:05');

    // Assert
    expect(result).toBe(-5);
  });
  
  test('parses negative time diff "-00:01:00" as -60 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('-00:01:00');

    // Assert
    expect(result).toBe(-60);
  });

  test('parses negative time diff "-01:00:00" as -3600 seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('-01:00:00');

    // Assert
    expect(result).toBe(-3600);
  });

  test('parses negative time diff "-12:34:56" as correct negative number of seconds', () => {

    // Act
    const result = parseTimeDiffToSeconds('-12:34:56');

    // Assert
    expect(result).toBe(-(12 * 3600 + 34 * 60 + 56));
  });
  
  test('ignores only the leading minus sign even if other minus-like characters are present', () => {

    // Act
    const result = parseTimeDiffToSeconds('-10:20:30');

    // Assert
    expect(result).toBe(-(10 * 3600 + 20 * 60 + 30));
  });
  
  test('handles large hour values to be Null (e.g. 123:45:06)', () => {

    // Act
    const result = parseTimeDiffToSeconds('123:45:06');

    // Assert
    expect(result).toBe(null);
  });

  test('handles large negative hour values to be Null (e.g. -123:45:06)', () => {

    // Act
    const result = parseTimeDiffToSeconds('-123:45:06');

    // Assert
    expect(result).toBe(null);
  });
  
  test('treats malformed numbers to be Null (e.g. "aa:bb:cc")', () => {

    // Act
    const result = parseTimeDiffToSeconds('aa:bb:cc');

    // Assert
    expect(result).toBe(null);
  });

  test('treats partially malformed string to be Null (e.g. "01:bb:30")', () => {

    // Act
    const result = parseTimeDiffToSeconds('01:bb:30');

    // Assert
    expect(result).toBe(null);
  });

  test('treats empty string to be Null', () => {

    // Act
    const result = parseTimeDiffToSeconds('');

    // Assert
    expect(result).toBe(null);
  });

  test('treats string with missing parts "12:34" to be Null', () => {

    // Act
    const result = parseTimeDiffToSeconds('12:34');

    // Assert
    expect(result).toBe(null);
  });

  test('treats non-string input (number) to be Null', () => {

    // Arrange
    const badInput = 12345;

    // Act
    const result = parseTimeDiffToSeconds(badInput);

    // Assert
    expect(result).toBe(null);
  });
  
  test('treats null input to be Null', () => {

    // Arrange
    const badInput = null;

    // Act
    const result = parseTimeDiffToSeconds(badInput);

    // Assert
    expect(result).toBe(null);
  });

  test('treats undefined input to be Null', () => {

    // Arrange
    const badInput = undefined;

    // Act
    const result = parseTimeDiffToSeconds(badInput);

    // Assert
    expect(result).toBe(null);
  });

  test('parses time diff without leading plus sign as positive value', () => {

    // Act
    const result = parseTimeDiffToSeconds('02:03:04');

    // Assert
    expect(result).toBe(2 * 3600 + 3 * 60 + 4);
  });
  
});
