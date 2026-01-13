import { useState } from 'react'

export default function SecondaryButton(props: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  color?: string
  toggleState?: boolean
}) {
  const [isActive, setIsActive] = useState(props.toggleState ? props.toggleState : false)

  function getColorClass() {
    if (isActive) {
      return 'text-ide-accent border-l-2 border-ide-accent'
    }
    return 'text-ide-text-muted hover:text-ide-text-primary'
  }

  const handleOnClick = () => {
    setIsActive(!isActive)
    if (props.onClick) {
      props.onClick()
    }
  }

  const baseClasses =
    'w-full h-12 flex items-center justify-center transition-colors duration-200 cursor-pointer'
  const stateClasses =
    props.toggleState !== undefined
      ? props.toggleState
        ? 'text-ide-accent border-l-2 border-ide-accent'
        : 'text-ide-text-muted hover:text-ide-text-primary'
      : getColorClass()

  return (
    <button className={`${baseClasses} ${stateClasses} ${props.className}`} onClick={handleOnClick}>
      {props.children}
    </button>
  )
}
