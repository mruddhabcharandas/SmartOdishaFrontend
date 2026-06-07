import { useEffect, useState } from 'react'
import api from '../../shared/lib/api'

export default function Categories() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [editing, setEditing] = useState(null)
  const load = async () => {
    const { data } = await api.get('/api/categories')
    setItems(data)
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    await api.post('/api/categories', form)
    setForm({ name: '', description: '' })
    load()
  }

  const update = async (e) => {
    e.preventDefault()
    if (!editing) return
    await api.put(`/api/categories/${editing._id}`, { name: editing.name, description: editing.description })
    setEditing(null)
    load()
  }

  const toggle = async (c) => {
    await api.put(`/api/categories/${c._id}`, { isActive: !c.isActive })
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>

      <form onSubmit={create} className="bg-white border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">Add category</button>
      </form>

      <div className="bg-white border rounded-lg divide-y overflow-hidden">
        {items.map((c) => (
          <div key={c._id} className="p-3 flex justify-between items-center">
            <div>
              <div className="font-medium capitalize">{c.name}</div>
              <div className="text-sm text-gray-500">{c.description || '—'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing({ ...c })} className="px-3 py-1 border rounded text-sm">Edit</button>
              <button type="button" onClick={() => toggle(c)} className={`px-3 py-1 rounded text-sm text-white ${c.isActive ? 'bg-red-600' : 'bg-green-600'}`}>{c.isActive ? 'Disable' : 'Enable'}</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-4 text-gray-500 text-sm">No categories</div>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={update} className="bg-white rounded-lg shadow p-6 w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Edit category</h2>
            <input className="border p-2 w-full rounded" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input className="border p-2 w-full rounded" placeholder="Description" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 border rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
