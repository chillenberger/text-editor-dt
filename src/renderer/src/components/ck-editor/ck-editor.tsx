import { useRef, useEffect, useMemo } from "react";
import { Editor } from 'ckeditor5';

// Provides a stable editor handle whose identity does not change every render.
// Stores the update callback in a ref so CKEditor onChange can invoke latest logic
// without causing re-renders or extra callback churn that might trigger repeated dispatches.
export default function useCKHtmlEditor(onUpdateCallback?: () => void) {
    const editorRef = useRef<Editor | null>(null);
    const callbackRef = useRef(onUpdateCallback);

    useEffect(() => {
        callbackRef.current = onUpdateCallback;
    }, [onUpdateCallback]);

    const api = useMemo(() => ({
        editorRef,
        invokeUpdate: () => {
            if (callbackRef.current) {
                callbackRef.current();
            }
        }
    }), []); // stable identity

    return api;
}
