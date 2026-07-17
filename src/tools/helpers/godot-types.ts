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
    // ⚡ Bolt: Fast-path with startsWith and exec to minimize RegExp matching overhead
    if (trimmed.startsWith('Vector2(')) {
      const v2Match = V2_RE.exec(trimmed)
      if (v2Match) {
        return { x: Number.parseFloat(v2Match[1]), y: Number.parseFloat(v2Match[2]) } as Vector2
      }
    } else if (trimmed.startsWith('Vector2i(')) {
      const v2iMatch = V2I_RE.exec(trimmed)
      if (v2iMatch) {
        return { x: Number.parseInt(v2iMatch[1], 10), y: Number.parseInt(v2iMatch[2], 10) } as Vector2
      }
    } else if (trimmed.startsWith('Vector3(')) {
      const v3Match = V3_RE.exec(trimmed)
      if (v3Match) {
        return {
          x: Number.parseFloat(v3Match[1]),
          y: Number.parseFloat(v3Match[2]),
          z: Number.parseFloat(v3Match[3]),
        } as Vector3
      }
    }
  }

  // Color ('C' = 67)
  if (firstChar === 67) {
    if (trimmed.startsWith('Color(')) {
      const colorMatch = COLOR_RE.exec(trimmed)
      if (colorMatch) {
        return {
          r: Number.parseFloat(colorMatch[1]),
          g: Number.parseFloat(colorMatch[2]),
          b: Number.parseFloat(colorMatch[3]),
          a: colorMatch[4] ? Number.parseFloat(colorMatch[4]) : 1.0,
        } as GodotColor
      }
    }
  }

  // Rect2 ('R' = 82)
  if (firstChar === 82) {
    if (trimmed.startsWith('Rect2(')) {
      const rectMatch = RECT2_RE.exec(trimmed)
      if (rectMatch) {
        return {
          x: Number.parseFloat(rectMatch[1]),
          y: Number.parseFloat(rectMatch[2]),
          w: Number.parseFloat(rectMatch[3]),
          h: Number.parseFloat(rectMatch[4]),
        } as Rect2
      }
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
  // ⚡ Bolt: Fast path for Array parsing using charCodeAt, inline index tracking, and integer states
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)

    let innerStart = 0
    let innerEnd = inner.length
    while (innerStart < innerEnd && inner.charCodeAt(innerStart) <= 32) innerStart++
    while (innerEnd > innerStart && inner.charCodeAt(innerEnd - 1) <= 32) innerEnd--

    if (innerStart >= innerEnd) return []

    const results: unknown[] = []
    let bracketLevel = 0
    let parenLevel = 0
    let inQuote = 0 // 0 means not in quote, 34 is ", 39 is '
    let start = innerStart

    for (let i = innerStart; i <= innerEnd; i++) {
      const charCode = i < innerEnd ? inner.charCodeAt(i) : 44 // 44 is ','

      if (inQuote !== 0) {
        if (charCode === inQuote && inner.charCodeAt(i - 1) !== 92) {
          // 92 is '\'
          inQuote = 0
        }
        continue
      }

      if (charCode === 34 || charCode === 39) {
        // '"' or "'"
        inQuote = charCode
        continue
      }

      if (charCode === 91)
        bracketLevel++ // '['
      else if (charCode === 93)
        bracketLevel-- // ']'
      else if (charCode === 40)
        parenLevel++ // '('
      else if (charCode === 41)
        parenLevel-- // ')'
      else if (charCode === 44 && bracketLevel === 0 && parenLevel === 0) {
        // ','
        let itemStart = start
        let itemEnd = i
        while (itemStart < itemEnd && inner.charCodeAt(itemStart) <= 32) itemStart++
        while (itemEnd > itemStart && inner.charCodeAt(itemEnd - 1) <= 32) itemEnd--

        const itemLen = itemEnd - itemStart
        if (itemLen > 0 || results.length > 0 || i < innerEnd) {
          const item = itemLen > 0 ? inner.slice(itemStart, itemEnd) : ''
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
  for (const key in properties) {
    if (Object.hasOwn(properties, key)) {
      result += `,"${key}":${toGodotValue(properties[key])}`
    }
  }
  return `${result})`
}
