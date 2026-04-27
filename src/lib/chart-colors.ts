/**
 * Gera paleta de cores para gráficos usando a cor primária do tenant
 * como destaque e variações da cor secundária para os demais itens.
 */

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h / 360) * 255)
  const b = Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255)
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function getThemeColor(varName: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  return val && val.startsWith('#') ? val : fallback
}

export function generatePalette(count: number): string[] {
  const primary = getThemeColor('--color-primary', '#2563eb')
  const [h, s] = hexToHsl(primary)

  if (count <= 1) return [primary]

  // Paleta monocromática: todos derivados da primária, variando luminosidade
  // para dar distinção sem fugir da identidade do tenant.
  const colors: string[] = [primary]
  const steps = count - 1
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / (steps + 1)
    // Luminosidade entre 0.30 (escuro) e 0.80 (claro)
    const l = 0.30 + t * 0.50
    // Mantém saturação, mas reduz levemente nos tons mais claros
    const sat = Math.max(0.25, s * (1 - t * 0.3))
    colors.push(hslToHex(h, sat, l))
  }

  return colors.slice(0, count)
}
