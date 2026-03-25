export async function analyzeImage(file: File): Promise<Record<string, unknown>> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/v1/analyze/image', { method: 'POST', body: fd })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const detail = data.detail ?? data.message ?? res.statusText
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

export function thumbDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(file)
  })
}
