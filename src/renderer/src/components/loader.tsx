interface LoaderProps {
  withText?: boolean;
}

export default function Loader({ withText = true }: LoaderProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
      {withText && <span className="ml-2 text-black">Loading...</span>}
    </div>
  )
}