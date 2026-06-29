import { describe, it, expect } from 'vitest'
import { validateAndFormatTscnProperties } from '../../src/tools/helpers/scene-parser.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'

describe('validateAndFormatTscnProperties', () => {
  it('returns empty string for undefined input', () => {
    expect(validateAndFormatTscnProperties(undefined)).toBe('')
  })

  it('formats valid properties correctly', () => {
    const properties = {
      text: '"Hello"',
      value: '42',
      color: 'Color(1, 0, 0, 1)'
    }
    const expected = 'text = "Hello"\nvalue = 42\ncolor = Color(1, 0, 0, 1)\n'
    expect(validateAndFormatTscnProperties(properties)).toBe(expected)
  })

  it('throws GodotMCPError for non-object input', () => {
    expect(() => validateAndFormatTscnProperties('invalid')).toThrow('Invalid properties format')
    expect(() => validateAndFormatTscnProperties(null)).toThrow('Invalid properties format')
    expect(() => validateAndFormatTscnProperties([1, 2, 3])).toThrow('Invalid properties format')
  })

  it('throws GodotMCPError for non-string keys or values', () => {
    try {
        validateAndFormatTscnProperties({ key: 123 });
        expect.fail('Should have thrown');
    } catch (e) {
        expect(e).toBeInstanceOf(GodotMCPError);
        expect((e as GodotMCPError).message).toBe('Invalid property value');
        expect((e as GodotMCPError).suggestion).toBe('Property keys and values must be strings.');
    }
  })

  it('throws GodotMCPError for invalid characters in keys', () => {
    try {
        validateAndFormatTscnProperties({ 'key=': 'value' });
        expect.fail('Should have thrown');
    } catch (e) {
        expect(e).toBeInstanceOf(GodotMCPError);
        expect((e as GodotMCPError).message).toBe('Invalid property key');
        expect((e as GodotMCPError).suggestion).toBe('Property keys must not contain "=", newlines.');
    }
  })

  it('throws GodotMCPError for invalid characters in values', () => {
    try {
        validateAndFormatTscnProperties({ key: 'value\n' });
        expect.fail('Should have thrown');
    } catch (e) {
        expect(e).toBeInstanceOf(GodotMCPError);
        expect((e as GodotMCPError).message).toBe('Invalid property value');
        expect((e as GodotMCPError).suggestion).toBe('Property values must not contain newlines.');
    }
  })
})
