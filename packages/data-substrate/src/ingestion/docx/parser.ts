import { statSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { DocumentStore } from '../../documents/store.js';
import { PythonCodeSandbox } from '@gordon/sandbox-runtime';
import { IngestionOptions, UnstructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';
import { DocumentChunk } from '@gordon/shared-types';

export class DocxIngestionParser {
  private docStore: DocumentStore;
  private pythonSandbox: PythonCodeSandbox;

  constructor(docStore: DocumentStore) {
    this.docStore = docStore;
    this.pythonSandbox = new PythonCodeSandbox({ timeoutMs: 60000 });
  }

  public async parseAndIndex(filePath: string, options: IngestionOptions = {}): Promise<UnstructuredIngestionResult> {
    if (!existsSync(filePath)) {
      throw new IngestionError(`DOCX file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const fileName = basename(filePath);
    const stat = statSync(filePath);

    // Python script to unzip and extract word/document.xml
    const pyScript = `
import zipfile
import xml.etree.ElementTree as ET

file_path = inputs.get('filePath')
paragraphs_data = []

try:
    with zipfile.ZipFile(file_path, 'r') as z:
        if 'word/document.xml' in z.namelist():
            doc_xml = z.read('word/document.xml')
            tree = ET.fromstring(doc_xml)
            
            # XML namespace for OpenXML wordprocessing
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            current_heading = 'Introduction'
            
            for p in tree.findall('.//w:p', ns):
                # Check for heading style
                pStyle = p.find('.//w:pStyle', ns)
                if pStyle is not None:
                    val = pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '')
                    if 'Heading' in val or 'Title' in val:
                        heading_text = ''.join(t.text for t in p.findall('.//w:t', ns) if t.text)
                        if heading_text.strip():
                            current_heading = heading_text.strip()
                
                # Extract paragraph text
                texts = [t.text for t in p.findall('.//w:t', ns) if t.text]
                p_text = ''.join(texts).strip()
                
                if p_text:
                    paragraphs_data.append({
                        'text': p_text,
                        'heading': current_heading
                    })

    export_result({'paragraphs': paragraphs_data})
except Exception as e:
    export_result({'error': str(e), 'paragraphs': []})
`;

    const pyResult = await this.pythonSandbox.runSnippet<{ paragraphs?: Array<{ text: string; heading: string }>; error?: string }>(
      pyScript,
      { filePath: filePath.replace(/\\/g, '/') }
    );

    const doc = this.docStore.registerDocument({
      sourcePath: filePath,
      filename: fileName,
      fileType: 'docx',
      fileSizeBytes: stat.size,
      metadata: { totalParagraphs: pyResult.result?.paragraphs?.length || 0 },
    });

    const chunks: DocumentChunk[] = [];
    const paragraphs = pyResult.result?.paragraphs || [];
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const chunk = this.docStore.addChunk({
        documentId: doc.id,
        chunkIndex: chunkIndex++,
        content: para.text,
        headingHierarchy: [para.heading],
      });
      chunks.push(chunk);
    }

    const durationMs = Date.now() - startTime;

    return {
      sourcePath: filePath,
      document: doc,
      chunks,
      totalChunks: chunks.length,
      durationMs,
    };
  }
}
