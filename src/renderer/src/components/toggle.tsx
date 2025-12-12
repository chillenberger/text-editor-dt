import { useState } from "react";

export default function SecondaryButton(props: {children: React.ReactNode, className?: string, onClick?: () => void, color?: string, toggleState?: boolean}) {
  const [isActive, setIsActive] = useState(props.toggleState ? props.toggleState : false);

  function getColorClass(color: string) {
    switch(color) {
      case 'blue':
        return 'bg-custom-blue-1 border-1 border-transparent text-custom-gray-4 hover:text-custom-gray-3 hover:border-l-2 hover:border-b-2 hover:border-custom-blue-2 active:bg-custom-blue-2';
      case 'green':
        return 'bg-custom-green-1 border-1 border-transparent text-custom-gray-4 hover:text-custom-gray-3 hover:border-l-2 hover:border-b-2 hover:border-custom-green-2 active:bg-custom-green-2';
      case 'purple':
        return 'bg-custom-purple-1 border-1 border-transparent text-custom-gray-4 hover:text-custom-gray-3 hover:border-l-2 hover:border-b-2 hover:border-custom-purple-2 active:bg-custom-purple-2';
      default:
        return 'bg-transparent border-1 border-transparent text-custom-gray-1 hover:bg-custom-gray-1 hover:border-l-2 hover:border-b-2 hover:border-custom-gray-2 hover:text-custom-gray-3';
    }
  }

  const handleOnClick = () => {
    setIsActive(!isActive);
    if (props.onClick) {
      props.onClick();
    }
  }

  const colorClasses = props.color && isActive ? getColorClass(props.color) : getColorClass('default');

  return (
    <button className={`${colorClasses} ${props.className} w-full hover:border-t-0 hover:border-r-0 font-bold rounded-md text-2xl active:border active:border-transparent hover:cursor-pointer`} onClick={handleOnClick}>
      {props.children}
    </button>
  )
}