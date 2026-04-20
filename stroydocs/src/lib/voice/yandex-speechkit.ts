export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', blob);

  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Ошибка транскрипции аудио');
  const data = await res.json() as { text: string };
  return data.text;
}
