// components/custom-editor.js
'use client'

import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Essentials, Paragraph, Bold, Italic, Editor, FullPage, GeneralHtmlSupport } from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import 'ckeditor5-premium-features/ckeditor5-premium-features.css';

interface DisplayEditorProps {
    editorHandle: { editorRef: React.MutableRefObject<Editor | null>, invokeUpdate: () => void };
    defaultContent: string;
}

export default function DisplayEditor({editorHandle, defaultContent}: DisplayEditorProps) {

    return (
        <div className="w-[50rem]">
            <CKEditor
                editor={ ClassicEditor }
                config={ {
                    licenseKey: 'GPL',
                    plugins: [ Essentials, Paragraph, Bold, Italic, FullPage, GeneralHtmlSupport ],
                    toolbar: [ 'undo', 'redo', '|', 'bold', 'italic' ],
                    initialData: defaultContent || "<p>Hello world!</p>",
                    htmlSupport: {
                        // fullPage: {
                        //     allowRenderStylesFromHead: true,
                        // },
                        allow: [
                            {
                                name: /.*/,
                                attributes: true,
                                classes: true,
                                styles: true
                            }
                        ]
                    }
                } }
                onReady={ (editor: Editor) => {
                    editorHandle.editorRef.current = editor;
                    editorHandle.invokeUpdate(); // initial dispatch once
                }}
                onChange={() => {
                    // Invoke latest callback via stable handle (avoids recreating object each render)
                    editorHandle.invokeUpdate();
                }}
            />
        </div>
    );
}
