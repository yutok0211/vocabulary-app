import { getMasteryLabel, getMasteryColor } from '../lib/mastery'

interface Props {
  level: number
  size?: 'sm' | 'md'
}

export function MasteryBadge({ level, size = 'md' }: Props) {
  const dots = Array.from({ length: 5 }, (_, i) => i < level)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${getMasteryColor(level)} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
    >
      {dots.map((filled, i) => (
        <span key={i} className={`inline-block rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${filled ? 'bg-current' : 'bg-current opacity-25'}`} />
      ))}
      <span className="ml-0.5">{getMasteryLabel(level)}</span>
    </span>
  )
}
