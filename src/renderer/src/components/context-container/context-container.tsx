export default function ContextContainer(props: {children: React.ReactNode, className?: string, color: string}) {
  return (
    <div className={`${props.className} bg-custom-gray-3 text-custom-gray-1 border border-custom-gray-1`}>
      { props.children}
    </div>
  )
}