import { useState } from 'react'
import api from '../lib/api'

export default function ImageUpload({ onUploaded }){
  const [loading, setLoading] = useState(false)
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await api.post('/api/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onUploaded?.(data.url)
    } finally { setLoading(false); e.target.value = '' }
  }
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="px-3 py-1 border rounded bg-white">{loading? 'Uploading...':'Upload Image'}</span>
      <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={loading} />
    </label>
  )
}

