export default function LeftNav(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${props.className} h-full bg-ide-base border-r border-ide-border`}>
      {props.children}
    </div>
  )
}
