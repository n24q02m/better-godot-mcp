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

/**
 * Parse a Godot value expression string into a JavaScript value
 */
export function parseGodotValue(expr: string): unknown {
  const trimmed = expr.trim()

  // Boolean
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  // null
  if (trimmed === 'null') return null

  // Number (int or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number.parseFloat(trimmed)
  }

  // String (quoted)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }

  // Vector2
  const v2Match = trimmed.match(/^Vector2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/)
  if (v2Match) {
    return { x: Number.parseFloat(v2Match[1]), y: Number.parseFloat(v2Match[2]) } as Vector2
  }

  // Vector2i
  const v2iMatch = trimmed.match(/^Vector2i\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/)
  if (v2iMatch) {
    return { x: Number.parseInt(v2iMatch[1], 10), y: Number.parseInt(v2iMatch[2], 10) } as Vector2
  }

  // Vector3
  const v3Match = trimmed.match(/^Vector3\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/)
  if (v3Match) {
    return {
      x: Number.parseFloat(v3Match[1]),
      y: Number.parseFloat(v3Match[2]),
      z: Number.parseFloat(v3Match[3]),
    } as Vector3
  }

  // Color
  const colorMatch = trimmed.match(
    /^Color\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)$/,
  )
  if (colorMatch) {
    return {
      r: Number.parseFloat(colorMatch[1]),
      g: Number.parseFloat(colorMatch[2]),
      b: Number.parseFloat(colorMatch[3]),
      a: colorMatch[4] ? Number.parseFloat(colorMatch[4]) : 1.0,
    } as GodotColor
  }

  // Rect2
  const rectMatch = trimmed.match(/^Rect2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/)
  if (rectMatch) {
    return {
      x: Number.parseFloat(rectMatch[1]),
      y: Number.parseFloat(rectMatch[2]),
      w: Number.parseFloat(rectMatch[3]),
      h: Number.parseFloat(rectMatch[4]),
    } as Rect2
  }

  // NodePath
  const npMatch = trimmed.match(/^NodePath\("([^"]*)"\)$/)
  if (npMatch) return npMatch[1]

  // ExtResource reference
  const extMatch = trimmed.match(/^ExtResource\("([^"]*)"\)$/)
  if (extMatch) return `ExtResource("${extMatch[1]}")`

  // SubResource reference
  const subMatch = trimmed.match(/^SubResource\("([^"]*)"\)$/)
  if (subMatch) return `SubResource("${subMatch[1]}")`

  // Array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    // Simple array parsing - split by comma (careful with nested)
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((item) => parseGodotValue(item.trim()))
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
    return `[${value.map(toGodotValue).join(', ')}]`
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
