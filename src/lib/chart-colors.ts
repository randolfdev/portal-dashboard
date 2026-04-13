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
  const secondary = getThemeColor('--color-secondary', '#7c3aed')

  const [secH, secS, secL] = hexToHsl(secondary)

  const colors: string[] = []

  // Primeiro item: cor primária (destaque principal)
  colors.push(primary)

  // Demais itens: variações da cor secundária
  // Alterna luminosidade e saturação para criar distinção visual
  const steps = Math.max(count - 1, 1)
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    // Varia luminosidade entre 0.35 e 0.70
    const l = 0.35 + t * 0.35
    // Varia saturação levemente
    const s = Math.max(0.3, secS + (i % 2 === 0 ? -0.1 : 0.1))
    // Pequeno deslocamento no hue para cada item
    const h = (secH + i * 18) % 360
    colors.push(hslToHex(h, s, l))
  }

  return colors.slice(0, count)
}
