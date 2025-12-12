export default function ChatArea(props: {children: React.ReactNode, className?: string}) {
  return (
    <div className={`${props.className} w-66 h-full bg-custom-gray-3 border-l border-custom-gray-1 p-4`}>
      { props.children}
    </div>
  )
}