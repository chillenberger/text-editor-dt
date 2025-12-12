import React, {useRef, useEffect, useState} from 'react';
import { getRootPath } from '@/services/file-service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faAdd
} from '@fortawesome/free-solid-svg-icons';


export default function UriForm ({handleAddDir}: {handleAddDir: (path: string) => void}) {
  const [rootPath, setRootPath] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);


  useEffect(() => { 
    getRootPath().then(rootPath => {
      setRootPath(rootPath);
    });
  }, [])

  const handleNewPath = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const filePath = formRef.current?.elements.namedItem('filePath') as HTMLInputElement;
    if ( !filePath || !rootPath ) return;

    const dirUri =rootPath + (filePath.value.startsWith("/") ? filePath.value.substring(1) : filePath.value);

    console.log("New URI submitted:", dirUri);
    handleAddDir(dirUri);
  }

  return (
    <div className="flex flex-row py-2 gap-2 items-center">
      <form ref={formRef} onSubmit={handleNewPath} className="flex flex-row gap-2 rounded-md flex-grow">
        <button type="submit" className="text-white rounded-md transition">
          <FontAwesomeIcon icon={faAdd} className="m-auto"/>
        </button>
        <input
          type="text"
          name={`filePath`}
          placeholder="Add Directory"
          className="file-input bg-transparent border-0 flex-grow"
        />
      </form>
    </div>
  )
}
