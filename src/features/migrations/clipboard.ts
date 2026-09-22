import { toast } from 'sonner'

export const copyText = (text: string, done: string) =>
  void navigator.clipboard
    .writeText(text)
    .then(() => toast(done))
    .catch(() => toast.error('Clipboard unavailable'))
