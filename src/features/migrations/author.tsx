import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { avatarUrl, profileUrl, type Author } from './model'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// Avatar and name, linked to the GitHub profile when the login is known.
export function AuthorName({
  author,
  size = 'sm',
  className,
}: {
  author: Author
  size?: 'sm' | 'lg'
  className?: string
}) {
  const large = size === 'lg'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Avatar className={large ? 'size-14' : 'size-6'}>
        {author.login && (
          <AvatarImage src={avatarUrl(author.login, large ? 112 : 48)} alt="" />
        )}
        <AvatarFallback className={large ? 'text-lg' : 'text-[0.6rem]'}>
          {initials(author.name)}
        </AvatarFallback>
      </Avatar>
      <span className={cn('grid', large && 'gap-0.5')}>
        {author.login ? (
          <a
            className={cn(
              'font-medium underline-offset-4 hover:underline',
              large && 'text-lg',
            )}
            href={profileUrl(author.login)}
          >
            {author.name}
          </a>
        ) : (
          <span className={cn('font-medium', large && 'text-lg')}>
            {author.name}
          </span>
        )}
        {author.login && large && (
          <span className="text-sm text-muted-foreground">@{author.login}</span>
        )}
      </span>
    </span>
  )
}
