export default function SecondaryButton(props: {children: React.ReactNode, onClick?: () => void, color?: string, disabled?: boolean, className?: string}) {
  function getColorClass(color: string) {
    switch(color) {
      case 'blue':
        return 'bg-custom-blue-1 border-1 border-custom-gray-1  hover:border-l-2 hover:border-b-2 hover:border-custom-blue-2 active:bg-custom-blue-2';
      case 'green':
        return 'bg-custom-green-1 border-1 border-custom-gray-1 hover:border-l-2 hover:border-b-2 hover:border-custom-green-2 active:bg-custom-green-2';
      case 'purple':
        return 'bg-custom-purple-1 border-1 border-custom-gray-1 hover:border-l-2 hover:border-b-2 hover:border-custom-purple-2 active:bg-custom-purple-2';
      default:
        return 'bg-custom-gray-3 hover:bg-custom-gray-4';
    }
  }

  const colorClasses = props.color ? getColorClass(props.color) : getColorClass('default');

  return (
    <button className={`${colorClasses} ${props.className || ''} text-custom-gray-4 hover:text-custom-gray-3  hover:border-t-0 hover:border-r-0 font-bold rounded-md text-2xl active:border active:border-transparent hover:cursor-pointer`} onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  )
}