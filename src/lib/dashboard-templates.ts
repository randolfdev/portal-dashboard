export type WidgetTemplate = {
  kind: 'metric_card' | 'chart_bar' | 'chart_line' | 'chart_pie' | 'table' | 'text'
  title: string
  config: Record<string, unknown>
  layout: { x: number; y: number; w: number; h: number }
}

export type DashboardTemplate = {
  title: string
  description: string
  widgets: WidgetTemplate[]
}

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
const sampleLine = months.map((m, i) => ({ name: m, value: 120 + i * 30 + Math.round(Math.random() * 40) }))
const sampleBar = months.map((m) => ({ name: m, value: Math.round(50 + Math.random() * 150) }))
const samplePie = [
  { name: 'Desktop', value: 55 },
  { name: 'Mobile', value: 35 },
  { name: 'Tablet', value: 10 },
]

export const defaultTemplate: DashboardTemplate = {
  title: 'Visão Geral',
  description: 'Dashboard padrão com métricas e gráficos de exemplo.',
  widgets: [
    {
      kind: 'metric_card',
      title: 'Receita Mensal',
      config: { value: 24500, prefix: 'R$', delta: 12.5, label: 'vs mês anterior' },
      layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
      kind: 'metric_card',
      title: 'Usuários Ativos',
      config: { value: 1248, delta: 8.2, label: 'vs mês anterior' },
      layout: { x: 3, y: 0, w: 3, h: 2 },
    },
    {
      kind: 'metric_card',
      title: 'Conversão',
      config: { value: 3.7, suffix: '%', delta: -1.2, label: 'vs mês anterior' },
      layout: { x: 6, y: 0, w: 3, h: 2 },
    },
    {
      kind: 'metric_card',
      title: 'Tickets Abertos',
      config: { value: 42, delta: -5, label: 'vs semana anterior' },
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },
    {
      kind: 'chart_line',
      title: 'Receita por Mês',
      config: { data: sampleLine, xKey: 'name', yKey: 'value' },
      layout: { x: 0, y: 2, w: 6, h: 4 },
    },
    {
      kind: 'chart_bar',
      title: 'Novos Cadastros',
      config: { data: sampleBar, xKey: 'name', yKey: 'value' },
      layout: { x: 6, y: 2, w: 6, h: 4 },
    },
    {
      kind: 'chart_pie',
      title: 'Acessos por Dispositivo',
      config: { data: samplePie, nameKey: 'name', valueKey: 'value' },
      layout: { x: 0, y: 6, w: 4, h: 4 },
    },
    {
      kind: 'text',
      title: 'Notas',
      config: { content: 'Este é um dashboard de exemplo. Edite os widgets para conectar seus dados reais.' },
      layout: { x: 4, y: 6, w: 8, h: 4 },
    },
  ],
}
