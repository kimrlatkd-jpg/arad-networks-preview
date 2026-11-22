ARAD V25 interior object source

Original editable Three.js scene geometry. The production IIFE bundle is ../../scenes.js.
Dependency versions: three 0.181.1, esbuild 0.25.11.
From the repository root, install these dependencies and bundle with esbuild:
  npm install --no-save three@0.181.1 esbuild@0.25.11
  npx esbuild site/assets/source/scene-source.js --bundle --format=iife --platform=browser --target=es2020 --minify --legal-comments=inline --outfile=site/scenes.js

Retain the Three.js MIT license in site/licenses/THREE-LICENSE.txt.
The visual models explain system concepts; they are not product specifications.
