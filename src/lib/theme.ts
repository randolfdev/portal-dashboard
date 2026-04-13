export type TenantTheme = {
  primaryColor?: string
  secondaryColor?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

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

function darken(hex: string, amount = 0.15): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l - amount))
}

function lighten(hex: string, amount = 0.35): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, Math.min(1, l + amount))
}

export function applyTheme(theme: TenantTheme) {
  const root = document.documentElement.style
  if (theme.primaryColor) {
    const [r, g, b] = hexToRgb(theme.primaryColor)
    // Set both hex (for direct use) and RGB (for Tailwind opacity)
    root.setProperty('--color-primary', theme.primaryColor)
    root.setProperty('--color-primary-rgb', `${r} ${g} ${b}`)
    root.setProperty('--color-primary-hover', darken(theme.primaryColor))
    root.setProperty('--color-primary-light', lighten(theme.primaryColor))
    const [rh, gh, bh] = hexToRgb(darken(theme.primaryColor))
    root.setProperty('--color-primary-hover-rgb', `${rh} ${gh} ${bh}`)
    const [rl, gl, bl] = hexToRgb(lighten(theme.primaryColor))
    root.setProperty('--color-primary-light-rgb', `${rl} ${gl} ${bl}`)
  }
  if (theme.secondaryColor) {
    const [r, g, b] = hexToRgb(theme.secondaryColor)
    root.setProperty('--color-secondary', theme.secondaryColor)
    root.setProperty('--color-secondary-rgb', `${r} ${g} ${b}`)
    root.setProperty('--color-secondary-hover', darken(theme.secondaryColor))
    root.setProperty('--color-secondary-light', lighten(theme.secondaryColor))
  }
}

export function resetTheme() {
  const root = document.documentElement.style
  const vars = [
    '--color-primary', '--color-primary-rgb', '--color-primary-hover',
    '--color-primary-hover-rgb', '--color-primary-light', '--color-primary-light-rgb',
    '--color-secondary', '--color-secondary-rgb', '--color-secondary-hover',
    '--color-secondary-light',
  ]
  vars.forEach((v) => root.removeProperty(v))
}
