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


// components/loading-animation.tsx

interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingAnimation({ size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]}`}>
      <span 
        className={`${sizeClasses[size]} bg-custom-green-1 rounded-full animate-bounce`}
        style={{ animationDelay: '0ms' }}
      />
      <span 
        className={`${sizeClasses[size]} bg-custom-blue-1 rounded-full animate-bounce`}
        style={{ animationDelay: '150ms' }}
      />
      <span 
        className={`${sizeClasses[size]} bg-custom-purple-1 rounded-full animate-bounce`}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}