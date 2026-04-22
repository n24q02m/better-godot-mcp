/**
 * Godot Types - Serialize/deserialize Godot native types
 *
 * Handles conversion between Godot expression strings and structured data:
 * Vector2(x, y), Vector3(x, y, z), Color(r, g, b, a), etc.
 */

export interface Vector2 {
  x: number
  y: number
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface GodotColor {
  r: number
  g: number
  b: number
  a: number
}

export interface Rect2 {
  x: number
  y: number
  w: number
  h: number
}

export interface Transform2D {
  x: Vector2
  y: Vector2
  origin: Vector2
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/
const V2_RE = /^Vector2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
const V2I_RE = /^Vector2i\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/
const V3_RE = /^Vector3\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
const COLOR_RE = /^Color\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)$/
const RECT2_RE = /^Rect2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
/**
 * Parse a Godot value expression string into a JavaScript value
 */
const MAX_PARSE_DEPTH = 32

export function parseGodotValue(expr: string, _depth = 0): unknown {
  if (_depth > MAX_PARSE_DEPTH) return expr
  const trimmed = expr.trim()

  // Boolean
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  // null
  if (trimmed === 'null') return null

  // Number (int or float)
  if (NUMBER_RE.test(trimmed)) {
    return Number.parseFloat(trimmed)
  }

  // String (quoted)
  const firstChar = trimmed.length > 0 ? trimmed.charCodeAt(0) : 0
  if (trimmed.length >= 2) {
    const last = trimmed.charCodeAt(trimmed.length - 1)
    if ((firstChar === 34 && last === 34) || (firstChar === 39 && last === 39)) {
      return trimmed.slice(1, -1)
    }
  }

  // ⚡ Bolt: Fast path for checking structural Godot types by checking first character
  // Vector2, Vector2i, Vector3 ('V' = 86)
  if (firstChar === 86) {
    const v2Match = trimmed.match(V2_RE)
    if (v2Match) {
      return { x: Number.parseFloat(v2Match[1]), y: Number.parseFloat(v2Match[2]) } as Vector2
    }

    const v2iMatch = trimmed.match(V2I_RE)
    if (v2iMatch) {
      return { x: Number.parseInt(v2iMatch[1], 10), y: Number.parseInt(v2iMatch[2], 10) } as Vector2
    }

    const v3Match = trimmed.match(V3_RE)
    if (v3Match) {
      return {
        x: Number.parseFloat(v3Match[1]),
        y: Number.parseFloat(v3Match[2]),
        z: Number.parseFloat(v3Match[3]),
      } as Vector3
    }
  }

  // Color ('C' = 67)
  if (firstChar === 67) {
    const colorMatch = trimmed.match(COLOR_RE)
    if (colorMatch) {
      return {
        r: Number.parseFloat(colorMatch[1]),
        g: Number.parseFloat(colorMatch[2]),
        b: Number.parseFloat(colorMatch[3]),
        a: colorMatch[4] ? Number.parseFloat(colorMatch[4]) : 1.0,
      } as GodotColor
    }
  }

  // Rect2 ('R' = 82)
  if (firstChar === 82) {
    const rectMatch = trimmed.match(RECT2_RE)
    if (rectMatch) {
      return {
        x: Number.parseFloat(rectMatch[1]),
        y: Number.parseFloat(rectMatch[2]),
        w: Number.parseFloat(rectMatch[3]),
        h: Number.parseFloat(rectMatch[4]),
      } as Rect2
    }
  }

  // NodePath
  if (trimmed.startsWith('NodePath("') && trimmed.endsWith('")')) {
    return trimmed.slice(10, -2)
  }

  // ExtResource reference
  if (trimmed.startsWith('ExtResource("') && trimmed.endsWith('")')) {
    return trimmed // already in correct format
  }

  // SubResource reference
  if (trimmed.startsWith('SubResource("') && trimmed.endsWith('")')) {
    return trimmed // already in correct format
  }

  // Array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []

    const results: unknown[] = []
    let bracketLevel = 0
    let parenLevel = 0
    let inQuote: string | null = null
    let start = 0

    for (let i = 0; i <= inner.length; i++) {
      const char = i < inner.length ? inner[i] : ','

      if (inQuote) {
        if (char === inQuote && inner[i - 1] !== '\\') {
          inQuote = null
        }
        continue
      }

      if (char === '"' || char === "'") {
        inQuote = char
        continue
      }

      if (char === '[') bracketLevel++
      else if (char === ']') bracketLevel--
      else if (char === '(') parenLevel++
      else if (char === ')') parenLevel--
      else if (char === ',' && bracketLevel === 0 && parenLevel === 0) {
        const item = inner.slice(start, i).trim()
        if (item || results.length > 0 || i < inner.length) {
          results.push(parseGodotValue(item, _depth + 1))
        }
        start = i + 1
      }
    }
    return results
  }

  // Return as-is for unrecognized types
  return trimmed
}

/**
 * Serialize a JavaScript value to a Godot expression string
 */
export function toGodotValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === true) return 'true'
  if (value === false) return 'false'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`

  if (Array.isArray(value)) {
    let result = '['
    for (let i = 0; i < value.length; i++) {
      if (i > 0) result += ', '
      result += toGodotValue(value[i])
    }
    return `${result}]`
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, number>
    // Rect2 (must check before Vector2 since Rect2 has x,y,w,h)
    if ('x' in obj && 'y' in obj && 'w' in obj && 'h' in obj) {
      return `Rect2(${obj.x}, ${obj.y}, ${obj.w}, ${obj.h})`
    }
    // Vector3
    if ('x' in obj && 'y' in obj && 'z' in obj) {
      return `Vector3(${obj.x}, ${obj.y}, ${obj.z})`
    }
    // Vector2
    if ('x' in obj && 'y' in obj) {
      return `Vector2(${obj.x}, ${obj.y})`
    }
    // Color
    if ('r' in obj && 'g' in obj && 'b' in obj) {
      const a = 'a' in obj ? obj.a : 1.0
      return `Color(${obj.r}, ${obj.g}, ${obj.b}, ${a})`
    }
  }

  return String(value)
}

/**
 * Serialize a Godot Object with class name and properties
 */
export function serializeGodotObject(className: string, properties: Record<string, unknown>): string {
  let result = `Object(${className}`
  for (const [key, value] of Object.entries(properties)) {
    result += `,"${key}":${toGodotValue(value)}`
  }
  return `${result})`
}
