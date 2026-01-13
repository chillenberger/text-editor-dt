export default function ContextContainer(props: {
  children: React.ReactNode
  className?: string
  color: string
}) {
  return (
    <div
      className={`${props.className} bg-ide-surface text-ide-text-primary border border-ide-border`}
    >
      {props.children}
    </div>
  )
}
