export default function Dot({color}: {color: string}) {
  const colorClass = () => {
    switch(color) {
      case 'blue':
        return 'bg-custom-blue-1';
      case 'green':
        return 'bg-custom-green-1';
      case 'purple':
        return 'bg-custom-purple-1';
      default:
        return 'gray';
    }
  }

  return (
    <div className={`w-3 h-3 rounded-full ${colorClass()} absolute top-2 left-2`}></div>
  )
}