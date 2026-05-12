import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

type PermissionProfile = {
  id: string
  name: string
  description: string | null
  can_manage_indicators: boolean
  can_manage_dashboards: boolean
  created_at: string
}

type Dashboard = {
  id: string
  title: string
  slug: string
}

type EditState = {
  profile: PermissionProfile | null
  name: string
  description: string
  canManageIndicators: boolean
  canManageDashboards: boolean
  dashboardIds: Set<string>
  saving: boolean
  error: string | null
}

const emptyEdit: EditState = {
  profile: null,
  name: '',
  description: '',
  canManageIndicators: false,
  canManageDashboards: false,
  dashboardIds: new Set(),
  saving: false,
  error: null,
}

export default function PermissionProfilesPage() {
  const tenant = useTenantData()
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState>(emptyEdit)
  const [open, setOpen] = useState(false)

  async function reload() {
    if (!tenant.id) return
    const [{ data: pp }, { data: db }] = await Promise.all([
      supabase
        .from('permission_profiles')
        .select('id, name, description, can_manage_indicators, can_manage_dashboards, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at'),
      supabase.from('dashboards').select('id, title, slug').eq('tenant_id', tenant.id).order('title'),
    ])
    setProfiles(pp ?? [])
    setDashboards(db ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [tenant.id])

  async function startEdit(p: PermissionProfile | null) {
    if (!p) {
      setEdit({ ...emptyEdit })
    } else {
      const { data } = await supabase
        .from('permission_profile_dashboards')
        .select('dashboard_id')
        .eq('permission_profile_id', p.id)
      setEdit({
        profile: p,
        name: p.name,
        description: p.description ?? '',
        canManageIndicators: p.can_manage_indicators,
        canManageDashboards: p.can_manage_dashboards,
        dashboardIds: new Set((data ?? []).map((r) => r.dashboard_id as string)),
        saving: false,
        error: null,
      })
    }
    setOpen(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!tenant.id) return
    setEdit((prev) => ({ ...prev, saving: true, error: null }))

    const payload = {
      tenant_id: tenant.id,
      name: edit.name.trim(),
      description: edit.description.trim() || null,
      can_manage_indicators: edit.canManageIndicators,
      can_manage_dashboards: edit.canManageDashboards,
    }

    let profileId = edit.profile?.id
    if (!profileId) {
      const { data, error } = await supabase
        .from('permission_profiles')
        .insert(payload)
        .select('id')
        .single()
      if (error || !data) {
        setEdit((prev) => ({ ...prev, saving: false, error: error?.message ?? 'Erro ao criar' }))
        return
      }
      profileId = data.id
    } else {
      const { error } = await supabase
        .from('permission_profiles')
        .update(payload)
        .eq('id', profileId)
      if (error) {
        setEdit((prev) => ({ ...prev, saving: false, error: error.message }))
        return
      }
    }

    // Sync dashboard allowlist: replace strategy
    await supabase.from('permission_profile_dashboards').delete().eq('permission_profile_id', profileId)
    if (edit.dashboardIds.size > 0) {
      const rows = Array.from(edit.dashboardIds).map((dashboard_id) => ({
        permission_profile_id: profileId!,
        dashboard_id,
      }))
      const { error: insertErr } = await supabase.from('permission_profile_dashboards').insert(rows)
      if (insertErr) {
        setEdit((prev) => ({ ...prev, saving: false, error: insertErr.message }))
        return
      }
    }

    setOpen(false)
    setEdit(emptyEdit)
    await reload()
  }

  async function remove(p: PermissionProfile) {
    if (!confirm(`Excluir perfil "${p.name}"?\n\nUsuários ligados a esse perfil ficarão sem perfil.`)) return
    await supabase.from('permission_profiles').delete().eq('id', p.id)
    await reload()
  }

  function toggleDashboard(id: string) {
    setEdit((prev) => {
      const next = new Set(prev.dashboardIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { ...prev, dashboardIds: next }
    })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Perfis de Acesso</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina o que cada perfil pode visualizar e gerenciar. Tenant admin / platform admin sempre veem tudo.
          </p>
        </div>
        <Button onClick={() => startEdit(null)}>+ Novo perfil</Button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          title="Nenhum perfil cadastrado"
          description="Crie um perfil para liberar dashboards específicos a um grupo de usuários."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-500">Descrição</th>
                <th className="px-4 py-3 font-medium text-slate-500">Permissões</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.description || '—'}</td>
                  <td className="px-4 py-3 space-x-1">
                    {p.can_manage_indicators && <Badge variant="primary">Indicadores</Badge>}
                    {p.can_manage_dashboards && <Badge variant="primary">Dashboards</Badge>}
                    {!p.can_manage_indicators && !p.can_manage_dashboards && (
                      <span className="text-slate-400 text-xs">somente visualização</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p)}>
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEdit(emptyEdit)
        }}
        title={edit.profile ? 'Editar perfil' : 'Novo perfil'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <input
              required
              value={edit.name}
              onChange={(e) => setEdit((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ex: Operacional, Financeiro, Diretoria"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Descrição (opcional)</label>
            <textarea
              value={edit.description}
              onChange={(e) => setEdit((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Permissões de criação</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={edit.canManageIndicators}
                onChange={(e) => setEdit((prev) => ({ ...prev, canManageIndicators: e.target.checked }))}
              />
              Pode criar e editar indicadores
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={edit.canManageDashboards}
                onChange={(e) => setEdit((prev) => ({ ...prev, canManageDashboards: e.target.checked }))}
              />
              Pode criar e editar dashboards
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Dashboards visíveis</p>
            {dashboards.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum dashboard cadastrado ainda.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {dashboards.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700 px-2 py-1 rounded hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={edit.dashboardIds.has(d.id)}
                      onChange={() => toggleDashboard(d.id)}
                    />
                    <span className="flex-1">{d.title}</span>
                    <span className="text-xs text-slate-400">{d.slug}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {edit.error && <p className="text-sm text-red-600">{edit.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false)
                setEdit(emptyEdit)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={edit.saving || !edit.name.trim()}>
              {edit.saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
