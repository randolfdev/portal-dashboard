import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (name: string, description: string, schedule: string) => Promise<void>
}

export default function SaveIndicatorModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('manual')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name, description, schedule)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Salvar Indicador">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Receita Mensal"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Descrição</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Agendamento</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="manual">Manual</option>
            <option value="5min">A cada 5 minutos</option>
            <option value="15min">A cada 15 minutos</option>
            <option value="1h">A cada 1 hora</option>
            <option value="daily">Diário</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
