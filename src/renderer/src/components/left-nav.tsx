export default function LeftNav(props: {children: React.ReactNode, className?: string}) {
  return (
    <div className={`${props.className} h-full bg-custom-gray-3 border-r border-custom-gray-1`}>
      { props.children}
    </div>
  )
}