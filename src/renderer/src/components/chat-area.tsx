export default function ChatArea(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${props.className} h-full bg-ide-surface border-l border-ide-border p-4`}>
      {props.children}
    </div>
  )
}
