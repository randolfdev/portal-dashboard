import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  permission_profile_id: string | null
  created_at: string
}

type PermissionProfileOption = {
  id: string
  name: string
}

const roleBadge: Record<string, { label: string; variant: 'primary' | 'success' | 'neutral' }> = {
  platform_admin: { label: 'Platform Admin', variant: 'primary' },
  tenant_admin: { label: 'Admin', variant: 'success' },
  member: { label: 'Membro', variant: 'neutral' },
}

export default function UsersPage() {
  const tenant = useTenantData()
  const [users, setUsers] = useState<Profile[]>([])
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfileOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [newRole, setNewRole] = useState('')
  const [newPermissionProfileId, setNewPermissionProfileId] = useState<string>('')

  useEffect(() => {
    if (!tenant.id) return
    Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, permission_profile_id, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at'),
      supabase
        .from('permission_profiles')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .order('name'),
    ]).then(([usersRes, ppRes]) => {
      setUsers(usersRes.data ?? [])
      setPermissionProfiles(ppRes.data ?? [])
      setLoading(false)
    })
  }, [tenant.id])

  async function updateRole() {
    if (!editUser || !newRole) return
    await supabase
      .from('profiles')
      .update({
        role: newRole,
        permission_profile_id: newRole === 'member' ? (newPermissionProfileId || null) : null,
      })
      .eq('id', editUser.id)
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUser.id
          ? {
              ...u,
              role: newRole,
              permission_profile_id: newRole === 'member' ? (newPermissionProfileId || null) : null,
            }
          : u,
      ),
    )
    setEditUser(null)
  }

  function permissionProfileName(id: string | null): string {
    if (!id) return '—'
    return permissionProfiles.find((p) => p.id === id)?.name ?? '—'
  }

  if (loading) return <LoadingSpinner />

  if (users.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário"
        description="Convide membros para o seu portal."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Usuários</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 font-medium text-slate-500">Papel</th>
                <th className="px-4 py-3 font-medium text-slate-500">Perfil de Acesso</th>
                <th className="px-4 py-3 font-medium text-slate-500">Desde</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = roleBadge[u.role] ?? roleBadge.member
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.role === 'member' ? permissionProfileName(u.permission_profile_id) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditUser(u)
                          setNewRole(u.role)
                          setNewPermissionProfileId(u.permission_profile_id ?? '')
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Alterar perfil"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {editUser?.full_name || editUser?.email}
          </p>
          <div>
            <label className="text-xs text-slate-500">Papel</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="member">Membro</option>
              <option value="tenant_admin">Admin</option>
            </select>
          </div>
          {newRole === 'member' && (
            <div>
              <label className="text-xs text-slate-500">Perfil de acesso</label>
              <select
                value={newPermissionProfileId}
                onChange={(e) => setNewPermissionProfileId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— sem perfil (nenhum dashboard) —</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {permissionProfiles.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Crie perfis em "Perfis de Acesso" para liberar dashboards a este usuário.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={updateRole}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
