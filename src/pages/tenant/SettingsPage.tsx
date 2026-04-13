import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import { applyTheme } from '../../lib/theme'
import Button from '../../components/ui/Button'

export default function SettingsPage() {
  const tenant = useTenantData()
  const [primary, setPrimary] = useState('#2563eb')
  const [secondary, setSecondary] = useState('#7c3aed')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (tenant.theme.primaryColor) setPrimary(tenant.theme.primaryColor)
    if (tenant.theme.secondaryColor) setSecondary(tenant.theme.secondaryColor)
    setName(tenant.name)
  }, [tenant])

  function preview() {
    applyTheme({ primaryColor: primary, secondaryColor: secondary })
  }

  async function save() {
    if (!tenant.id) return
    setSaving(true)
    await supabase
      .from('tenants')
      .update({
        name,
        theme: { primaryColor: primary, secondaryColor: secondary },
      })
      .eq('id', tenant.id)
    applyTheme({ primaryColor: primary, secondaryColor: secondary })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-800">Configurações</h2>

      {/* Branding */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Branding</h3>

        <div className="space-y-1">
          <label className="text-sm text-slate-600">Nome do portal</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Cor primária</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{primary}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Cor secundária</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{secondary}</span>
            </div>
          </div>
        </div>

        {/* Preview blocks */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: primary }} />
          <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: secondary }} />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={preview}>
            Pré-visualizar
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          {saved && <span className="text-sm text-green-600">Salvo!</span>}
        </div>
      </section>

      {/* Logo placeholder */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Logo</h3>
        <div className="flex items-center gap-4">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              Sem logo
            </div>
          )}
          <p className="text-sm text-slate-500">Upload de logo será habilitado em breve.</p>
        </div>
      </section>
    </div>
  )
}
