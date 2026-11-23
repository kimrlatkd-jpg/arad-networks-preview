import * as esbuild from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const source=path.dirname(fileURLToPath(import.meta.url));
// This source folder lives at <site>/assets/source/photoreal-v36.
const site=path.resolve(source,'../../..');
for(const [entry,output] of [['interior-entry.js','scenes.js'],['selector-entry.js','selector-objects.js']]){
 await esbuild.build({entryPoints:[path.join(source,entry)],outfile:path.join(site,output),bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'eof'});
}
