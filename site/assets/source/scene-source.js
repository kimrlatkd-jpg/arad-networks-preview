/* ARAD V27: authored architectural objects. Three.js MIT; no remote assets. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
const TYPES=new Set(['isolate','accelerate','connect']), registry=new Set(), mounted=new WeakMap();
let active=null;
const clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function chooseActive(){let winner=null;for(const item of registry){if(item.disposed||item.failed||!item.container.isConnected||item.ratio<=0)continue;if(!winner||item.ratio>winner.ratio||(item.ratio===winner.ratio&&item===active))winner=item;}if(document.hidden)winner=null;active=winner;for(const item of registry)item.activate(item===winner);}
function material(color,metalness=.8,roughness=.36,extra={}){
 const mat=new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:0,clearcoatRoughness:.44,...extra});
 // Structural metal is not an emitter. Keep reflected radiance below the bloom threshold;
 // optical fibers have their own HDR shader and retain luminous scattering.
 if(metalness>.6)mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight = min(outgoingLight, vec3(1.35));\n#include <opaque_fragment>');};
 return mat;
}
function satinMap(normal=false){
 const w=256,h=256,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,line=Math.sin(y*2.417+Math.sin(x*.018)*.48),grain=rand(y*3.13+x*.017),v=Math.round(186+line*14+grain*26);
  if(normal){data[i]=128;data[i+1]=Math.round(128+line*4+(grain-.5)*3);data[i+2]=255;}else data[i]=data[i+1]=data[i+2]=v;
  data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.4,7);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
function kit(){const satin=satinMap();const brushed={roughnessMap:satin};return{
 silver:material('#8C9AAE',.94,.39,{...brushed}),edge:material('#B1BACA',.91,.32,{...brushed}),
 brushed:material('#687A91',.9,.53,{...brushed}),navy:material('#1B2A55',.73,.43,{roughnessMap:satin,clearcoat:.13,clearcoatRoughness:.42}),
 dark:material('#101A28',.83,.52,{roughnessMap:satin}),etched:material('#263449',.84,.72,{roughnessMap:satin}),inset:material('#02050B',.25,.66),
 concrete:material('#263247',.26,.72),glass:material('#17385C',.4,.25,{transparent:true,opacity:.45}),porcelain:material('#8D9CAC',.28,.47)};}
function box(parent,size,pos,mat,radius=.045){const g=new RoundedBoxGeometry(...size,3,Math.min(radius,Math.min(...size)*.32)),mesh=new THREE.Mesh(g,mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function bar(parent,a,b,width,depth,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from),mesh=box(parent,[width,d.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),mat);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
function cylinder(parent,radius,height,pos,mat,segments=32){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function path(points){return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal',.1);}
function pipe(parent,curve,radius,mat){const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,6,false),mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function stage(root,offset,delay=0){const group=new THREE.Group();root.add(group);return{group,offset:new THREE.Vector3(...offset),delay};}
function mergeSolids(root){const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});for(const parent of parents){const groups=new Map();for(const o of [...parent.children]){if(!o.isMesh||o.material.isShaderMaterial||o.material.transparent)continue;if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}for(const [mat,meshes]of groups){if(meshes.length<2)continue;const geometries=meshes.map(o=>{o.updateMatrix();const geo=o.geometry.clone().applyMatrix4(o.matrix);if(!geo.index)return geo;const flat=geo.toNonIndexed();geo.dispose();return flat;});const g=mergeGeometries(geometries,false);geometries.forEach(a=>a.dispose());if(!g)continue;const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;for(const o of meshes){o.removeFromParent();o.geometry.dispose();}parent.add(mesh);}}}
function fiberBank(parent,curves,lane,signals){
 const geos=[],halos=[];
 curves.forEach((c,i)=>{const radius=.005+rand(i+lane*41)*.0055;for(const[list,r]of[[geos,radius],[halos,radius*4.6]]){
  const g=new THREE.TubeGeometry(c,76,r,4,false),seed=new Float32Array(g.attributes.position.count);seed.fill(rand(i*3.7+lane*71));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));list.push(g);
 }});
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uTime:{value:0},uProgress:{value:0},uWeight:{value:1},uReveal:{value:1},uHalo:{value:0}},
 vertexShader:`attribute float aSeed;varying vec2 vUv;varying float vSeed;varying float vDepth;void main(){vUv=uv;vSeed=aSeed;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float uTime,uProgress,uWeight,uReveal,uHalo;varying vec2 vUv;varying float vSeed,vDepth;void main(){
 float travel=uTime*.16+uProgress*4.6;float head=fract(vUv.x-travel*(.7+vSeed*.45)+vSeed);float packet=exp(-pow((head-.5)/(.035+vSeed*.055),2.));
 float fine=.82+.18*sin(vUv.x*19.+vSeed*43.);float edge=smoothstep(0.,.015,vUv.x)*(1.-smoothstep(.985,1.,vUv.x));float reveal=1.-smoothstep(uReveal-.12,uReveal,vUv.x);
 float depth=clamp(1.24-vDepth*.009,.53,1.);vec3 c=mix(vec3(.04,.22,.8),vec3(.67,.86,1.),packet*.86);
 float strength=(.4+packet*2.25)*(.55+vSeed*.72)*fine*uWeight*edge*reveal*depth;
 float sheath=pow(max(0.,sin(vUv.y*3.14159)),1.7);gl_FragColor=vec4(c*strength*(uHalo>.5?.045*sheath:1.),1.);
 }`});
 const haloMat=mat.clone();haloMat.uniforms.uHalo.value=1;
 for(const[list,m]of[[geos,mat],[halos,haloMat]]){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,m);mesh.renderOrder=m===mat?3:2;parent.add(mesh);}
 signals.push({lane,mat,haloMat,count:curves.length});
}
function marker(parent,size,pos,lane,highlights,m){const mat=m.navy.clone();box(parent,size,pos,mat,.015);highlights.push({lane,mat,color:new THREE.Color('#426E9E'),endpoint:true});}
function finish(model){mergeSolids(model.root);model.root.updateMatrixWorld(true);model.bounds=new THREE.Box3().setFromObject(model.root);return model;}

function isolate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // Three independent vertical cavities: a heavy, continuous base and deep machined partitions.
 box(root,[10.9,.55,4.25],[0,-3.18,0],m.dark,.11);
 box(root,[10.9,.11,4.26],[0,-2.88,0],m.brushed,.025);
 box(root,[10.3,.07,.13],[0,-3.2,2.15],m.inset,.015);
 for(let lane=0;lane<3;lane++){
  const x=(lane-1)*3.5,z=(1-lane)*.37,s=stage(root,[0,.58+lane*.17,-.4],lane*.19),g=s.group;stages.push(s);
  box(g,[3.18,5.95,.29],[x,.13,z-1.48],m.navy,.09);
  box(g,[2.74,5.42,.085],[x,.09,z-1.29],m.dark,.02);
  for(let q=0;q<11;q++)box(g,[2.62,.022,.026],[x,-2.3+q*.46,z-1.23],m.etched,.004);
  // The opaque inner plane sits deep behind the luminous paths; sides carry the weight.
  box(g,[2.76,.15,2.54],[x,-2.66,z-.02],m.inset,.025);
  box(g,[2.76,.15,2.54],[x,2.8,z-.02],m.inset,.025);
  for(const dx of [-1.53,1.53]){
    box(g,[.24,6.04,2.88],[x+dx,.11,z-.18],m.brushed,.045);
    box(g,[.045,5.94,.16],[x+dx+.035,.11,z+1.31],m.brushed,.014);
  }
  for(const y of [-2.82,3.04]){
    box(g,[3.1,.16,2.87],[x,y,z-.18],m.brushed,.036);
    box(g,[2.8,.09,.27],[x,y,z+1.31],m.brushed,.018);
  }
  // A deep recessed opening; density varies instead of a bank of equal parallel strokes.
  const curves=[];
  for(let f=0;f<108;f++){
    const u=(f%36/35-.5)*2.22,layer=Math.floor(f/36),depth=-.92+layer*.77+rand(f+lane*90)*.18,sway=(rand(f*3.1)-.5)*.4;
    curves.push(path([[x+u*.72,-2.55,z+depth*.72],[x+u*.8,-1.8,z+depth+.15],[x+u+sway,-.12,z+depth+.3*Math.sin(f*.23)],[x+u*.94,1.75,z+depth+.17],[x+u*.7,2.72,z+depth*.72]]));
  }
  // Machined connector cassettes at both ends anchor the layered optical field.
  for(const yy of[-2.65,2.82])for(let q=0;q<9;q++){
    box(g,[.19,.14,2.3],[x-.96+q*.24,yy,z-.03],m.etched,.016);
    box(g,[.08,.033,2.2],[x-.96+q*.24,yy+.09,z-.03],m.dark,.005);
  }
  fiberBank(g,curves,lane,signals);
  marker(g,[2.0,.065,.1],[x,-2.67,z+1.49],lane,highlights,m);marker(g,[2.0,.065,.1],[x,2.83,z+1.49],lane,highlights,m);
  // Rear seams, side relief and narrow machined base toes are physically attached.
  for(let k=0;k<11;k++)box(g,[.045,4.9,.065],[x+1.65,.05,z-1.23+k*.24],m.dark,.006);
  box(root,[2.54,.16,3.42],[x,-2.8,z+.18],m.dark,.03);
  anchors.push({start:[x,-2.65,z+1.6],end:[x,2.82,z+1.6]});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(7.8,4.9,17),targetOffset:new THREE.Vector3(0,-.08,0),groundY:-3.48,cameraDrift:[-.075,.025],fill:.91,duration:4.4});
}

function accelerate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // Long interleaved transmission engine: horizontal force and strongly recessed channels.
 box(root,[17.4,.85,6.5],[0,-1.72,0],m.dark,.13);
 box(root,[16.9,.18,6.42],[0,-2.2,0],m.brushed,.035);
 for(let k=0;k<5;k++)box(root,[15.6,.035,.06],[0,-1.46-k*.13,3.3],m.etched,.006);
 box(root,[17.1,.12,6.05],[0,-1.23,0],m.brushed,.03);
 for(const x of [-7.6,7.6])box(root,[1.05,.5,5.9],[x,-.98,0],m.navy,.08);
 for(let lane=0;lane<3;lane++){
   const z=(lane-1)*1.92,y=(2-lane)*.7-.55,s=stage(root,[-.9-lane*.2,.25,0],lane*.14),g=s.group;stages.push(s);
   box(g,[16.25,.46,1.72],[0,y,z],m.navy,.075);
   box(g,[15.82,.065,1.39],[0,y+.265,z],m.inset,.015);
   for(const off of [-.82,.82])box(g,[16.3,.18,.13],[0,y+.25,z+off],m.brushed,.035);
   // Tall rear fins and short foreground lips expose each luminous core at the camera angle.
   for(let i=0;i<29;i++){
     const x=-7.6+i*.54,hh=.52+(Math.sin(i/28*Math.PI)*.38);
     box(g,[.105,hh,.3],[x,y+.32+hh/2,z-.65],i%7===0?m.brushed:m.etched,.018);
     box(g,[.105,.22,.23],[x,y+.4,z+.65],m.etched,.016);
     box(g,[.105,.075,1.24],[x,y+.33,z],m.dark,.012);
   }
   const curves=[];
   for(let f=0;f<96;f++){
     const off=(f%32/31-.5)*1.13,layer=Math.floor(f/32),h=.06+layer*.14+rand(f+lane*71)*.07;
     curves.push(path([[-8.0,y+.43,z+off*.74],[-5.9,y+.44+h,z+off],[-1.3,y+.46+h,z+off+.07*Math.sin(f*.13)],[3.9,y+.44+h,z+off],[8.01,y+.43,z+off*.74]]));
   }
   fiberBank(g,curves,lane,signals);
   for(const x of [-8.12,8.12]){box(g,[.57,1.05,1.83],[x,y+.13,z],m.brushed,.05);box(g,[.055,.45,1.42],[x+Math.sign(x)*.23,y+.18,z],m.inset,.012);}
   marker(g,[.055,.07,1.18],[8.01,y+.42,z],lane,highlights,m);
   anchors.push({start:[-8,y+.52,z],end:[8,y+.52,z]});
 }
 // Dark end manifold with a single broad metal surface; never chrome on every edge.
 box(root,[1.1,3.37,6.64],[8.8,-.05,0],m.navy,.12);
 box(root,[.075,3.02,6.21],[9.37,-.03,0],m.brushed,.02);
 for(let i=0;i<21;i++)box(root,[.07,.04,5.7],[9.43,-1.22+i*.12,0],m.dark,.007);
 box(root,[.07,2.62,.075],[9.47,.05,2.96],m.silver,.012);
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(10,9.2,21),targetOffset:new THREE.Vector3(.18,-.05,0),groundY:-2.34,cameraDrift:[-.105,-.015],fill:.92,duration:4.4});
}

function connect(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[],details=[];
 // A continuous industrial land section, with three architectural masses and a usable open tunnel.
 box(root,[5.2,2.1,8.1],[-4.3,-1.48,.05],m.concrete,.06);
 box(root,[5.2,2.1,8.1],[4.3,-1.48,.05],m.concrete,.06);
 box(root,[3.4,2.1,4.2],[0,-1.48,-1.91],m.concrete,.04);
 // Front wall is genuinely removed at the tunnel; no drawn tunnel sticker.
 box(root,[13.98,.3,8.2],[0,-.26,.05],m.brushed,.045);
 box(root,[13.7,.08,7.94],[0,-.055,.05],m.dark,.018);
 box(root,[13.6,.1,8.0],[0,-2.59,.05],m.dark,.022);
 // Deep foreground incision: black recess and two thick section cheeks.
 box(root,[5.2,1.84,.26],[-4.29,-1.45,4.16],m.concrete,.025);
 box(root,[5.2,1.84,.26],[4.29,-1.45,4.16],m.concrete,.025);
 
 box(root,[2.85,.09,4.2],[0,-2.32,2.26],m.dark,.02);
 const arch=new THREE.Shape();arch.moveTo(-1.59,-2.36);arch.lineTo(-1.59,-1.63);arch.absarc(0,-1.63,1.59,Math.PI,0,true);arch.lineTo(1.59,-2.36);arch.closePath();const hole=new THREE.Path();hole.moveTo(-1.32,-2.27);hole.lineTo(1.32,-2.27);hole.lineTo(1.32,-1.63);hole.absarc(0,-1.63,1.32,0,Math.PI,false);hole.closePath();arch.holes.push(hole);
 const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(arch,{depth:3.5,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:32}),m.brushed);shell.position.z=.72;shell.castShadow=true;shell.receiveShadow=false;root.add(shell);
 // Main hall is a large dark satin mass with an exposed service interior to the right.
 const hall=stage(root,[0,.7,-.2],.05);stages.push(hall);
 box(hall.group,[7.9,3.65,4.65],[-2.3,1.88,-.83],m.navy,.09);
 const roof=new THREE.Group();hall.group.add(roof);details.push({group:roof});
 box(roof,[8.03,.2,4.74],[-2.3,3.8,-.83],m.brushed,.035);
 for(let j=0;j<23;j++)box(roof,[.042,.035,4.35],[-5.84+j*.32,3.925,-.83],m.dark,.006);
 box(roof,[5.9,.24,.82],[-2.3,4.0,-1.2],m.dark,.035);
 for(let f=0;f<11;f++)box(roof,[.095,.19,.7],[-4.75+f*.49,4.08,-1.2],m.brushed,.014);
 for(const x of [-5.95,1.35])box(hall.group,[.07,.075,4.3],[x,3.94,-.83],m.dark,.012);
 box(hall.group,[7.52,3.2,.12],[-2.3,1.82,1.55],m.dark,.025);
 for(let j=0;j<24;j++)box(hall.group,[7.3,.027,.038],[-2.3,.38+j*.12,1.64],m.brushed,.005);
 for(const xx of[-5.8,1.3])box(hall.group,[.09,3.48,4.42],[xx,1.86,-.83],m.brushed,.015);
 for(let i=0;i<12;i++)box(hall.group,[.09,3.02,.14],[-5.78+i*.63,1.88,1.64],m.brushed,.012);
 box(hall.group,[7.4,.08,.09],[-2.3,2.68,1.75],m.navy,.012);
 // A secondary high service tower and a lower uncovered plant bay create a stepped skyline.
 const tower=stage(root,[0,1,-.12],.3);stages.push(tower);
 box(tower.group,[3.03,5.22,3.3],[4.63,2.66,-2.05],m.dark,.08);
 box(tower.group,[3.16,.15,3.43],[4.63,5.34,-2.05],m.brushed,.026);
 box(tower.group,[.1,5.0,3.1],[6.18,2.68,-2.05],m.brushed,.018);
 for(let i=0;i<7;i++)box(tower.group,[2.7,.065,.08],[4.63,.55+i*.63,-.34],m.brushed,.009);
 const bay=stage(root,[.25,.5,.12],.16);stages.push(bay);
 box(bay.group,[4.65,.18,3.92],[4.37,.18,1.65],m.brushed,.03);
 for(const x of [2.25,6.48])for(const z of [.04,3.3]){box(bay.group,[.2,2.54,.2],[x,1.54,z],m.brushed,.025);box(bay.group,[.37,.1,.37],[x,.31,z],m.dark,.015);}
 for(const z of [.04,3.3])box(bay.group,[4.53,.23,.22],[4.37,2.84,z],m.brushed,.03);
 box(bay.group,[4.53,.12,1.02],[4.37,3.01,.4],m.navy,.025);
 for(const x of [3.05,4.13,5.21]){box(bay.group,[.84,1.78,.92],[x,1.12,1.4],m.navy,.045);box(bay.group,[.72,1.55,.06],[x,1.14,1.89],m.inset,.018);for(let j=0;j<5;j++)box(bay.group,[.56,.028,.04],[x,.55+j*.1,1.94],m.brushed,.005);}
 for(let k=0;k<17;k++)box(tower.group,[.035,4.5,.05],[3.41+k*.15,2.65,-.32],m.brushed,.005);
 for(let k=0;k<8;k++){
  box(root,[5.0,.028,.03],[-4.3,-.68-k*.2,4.3],m.brushed,.005);
  box(root,[5.0,.028,.03],[4.3,-.68-k*.2,4.3],m.brushed,.005);
 }
 // 5G equipment remains subordinate to architecture.
 cylinder(root,.075,1.4,[-4.9,4.59,-1.7],m.brushed);box(root,[.34,.83,.2],[-4.9,5.0,-1.54],m.porcelain,.035);
 for(const p of [[-1.15,2.79,1.79],[2.45,2.91,1.15],[5.95,2.91,3.15]])box(root,[.3,.18,.28],p,m.porcelain,.025);
 const routes=[
  [[-4.9,4.99,-1.3],[-3.9,4.8,-.55],[-1.85,4.15,.12],[1.7,3.3,1.2],[5.75,2.91,3.15]],
  [[-1.15,2.88,1.92],[.35,3.12,2.18],[2.45,3.03,1.35],[4.05,3.22,2.32],[5.95,3.02,3.3]],
  [[4.13,.61,1.97],[3.6,.35,3.12],[1.04,.25,3.66],[.96,-.56,4.53],[.7,-1.35,4.53],[.2,-1.99,4.4],[-.45,-2.07,3.55],[-.6,-2.07,1.8]]
 ];
 pipe(root,path(routes[2]),.063,m.dark);
 for(let lane=0;lane<3;lane++){
   const curves=[];for(let i=0;i<(lane===2?48:54);i++){const spread=(i/53-.5),layer=Math.floor(i/18)-1;curves.push(path(routes[lane].map((p,j)=>{const fan=Math.sin(j/(routes[lane].length-1)*Math.PI);return[p[0]+spread*(lane===2?.33:.3),p[1]+fan*spread*(lane===2?.28:.85),p[2]+fan*layer*.19+spread*.12]})));}
   fiberBank(root,curves,lane,signals);const end=routes[lane].at(-1);marker(root,[.22,.07,.22],end,lane,highlights,m);anchors.push({start:routes[lane][0],end});
 }
 return finish({root,signals,highlights,anchors,stages,details,direction:new THREE.Vector3(11,7.3,18),targetOffset:new THREE.Vector3(0,-.25,.1),groundY:-2.78,cameraDrift:[.09,.025],fill:.91,duration:4.6});
}

function studio(renderer,scene,mobile){const env=new THREE.Scene();env.background=new THREE.Color('#263348');for(const[w,h,x,y,z,color,power]of[[19,9,-7,13,8,'#E3EAF6',2.3],[4,13,11,6,-2,'#9AAEC9',1.9],[13,3,-2,6,-10,'#A8BEDC',1.6],[3,8,-13,2,3,'#D7E3F5',1.45],[9,2,0,-8,6,'#19263C',.6]]){const soft=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));soft.material.color.multiplyScalar(power);soft.position.set(x,y,z);soft.lookAt(0,0,0);env.add(soft);}const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(env,.055,.1,70);scene.environment=environment.texture;scene.environmentIntensity=1.12;env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();const key=new THREE.DirectionalLight('#DDE7F7',.95);key.position.set(-7,14,9);key.castShadow=true;key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:12,bottom:-12,near:.1,far:55});key.shadow.normalBias=.055;key.shadow.bias=.00005;scene.add(key);const rim=new THREE.DirectionalLight('#7D9FCF',.42);rim.position.set(8,5,-9);scene.add(rim);scene.add(new THREE.HemisphereLight('#D8E5F7','#050913',.55));return{environment,key};}
function releaseScene(scene){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}

function mount(container,options={}){
 if(!container||typeof container.appendChild!=='function')throw new TypeError('ARADObjects.mount requires a container element.');mounted.get(container)?.dispose();const type=TYPES.has(options.type)?options.type:'isolate';const reduced=typeof options.reducedMotion==='boolean'?options.reducedMotion:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const originalPosition=container.style.position;if(getComputedStyle(container).position==='static')container.style.position='relative';delete container.dataset.objectError;delete container.dataset.objectReady;
 const item={container,ratio:0,disposed:false,failed:false,activate};let renderer,composer,bloom,aaPass,canvas,scene,camera,model,lighting,resizeObserver,intersectionObserver;let raf=0,enabled=false,paused=false,ready=false,last=0,elapsed=0,width=0,height=0;let runUntil=4.8,mode=0,modeFrom=[1,.36,.36],weights=[...modeFrom],modeTime=0,currentTime=0,introStart=0,scrollProgress=0;const look=new THREE.Vector3(),cameraAim=new THREE.Vector3(),baseCamera=new THREE.Vector3(),floorMaterial=new THREE.ShadowMaterial({color:'#000208',opacity:.4});
 function fail(code){item.failed=true;container.dataset.objectError=code;delete container.dataset.objectReady;if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;chooseActive();}
 function init(){if(renderer||item.failed||item.disposed)return!!renderer;try{canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',visibility:'hidden'});canvas.addEventListener('webglcontextlost',contextLost);renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setClearColor('#000208',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();scene.background=new THREE.Color('#000208');camera=new THREE.PerspectiveCamera(34,1,.1,160);model=({isolate,accelerate,connect})[type]();scene.add(model.root);lighting=studio(renderer,scene,window.innerWidth<700);const floor=new THREE.Mesh(new THREE.PlaneGeometry(45,45),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=model.groundY;floor.receiveShadow=true;scene.add(floor);const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});rt.samples=window.innerWidth<700?2:4;composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.23,.34,1.65);composer.addPass(bloom);composer.addPass(new OutputPass());aaPass=new SMAAPass();composer.addPass(aaPass);for(const image of [aaPass._areaTexture.image,aaPass._searchTexture.image])image.addEventListener('load',()=>{if(enabled&&!item.disposed&&!item.failed)draw(currentTime);},{once:true});composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;gl_FragColor=vec4(max(c,vec3(0.,.0078431373,.031372549)),1.);}'}));container.appendChild(canvas);runUntil=model.duration;if(scrollProgress>.015){elapsed=model.duration;runUntil=elapsed;}resize();return true;}catch(error){if(scene)releaseScene(scene);lighting?.environment.dispose();composer?.dispose();renderer?.dispose();renderer=null;canvas?.remove();fail('webgl-unavailable');return false;}}
 function contextLost(event){event.preventDefault();if(!item.disposed)fail('context-lost');}
 function frameCamera(){if(!model||!width||!height)return;const bounds=model.bounds,center=bounds.getCenter(new THREE.Vector3());look.copy(center).add(model.targetOffset);const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));camera.aspect=width/height;camera.updateProjectionMatrix();const direction=model.direction.clone().normalize();let distance=bounds.getSize(new THREE.Vector3()).length()*1.25;for(let i=0;i<7;i++){camera.position.copy(look).addScaledVector(direction,distance);camera.lookAt(look);camera.updateMatrixWorld();let extent=0;for(const p of corners){const v=p.clone().project(camera);extent=Math.max(extent,Math.abs(v.x)/model.fill,Math.abs(v.y)/.89);}if(Math.abs(extent-1)<.004)break;distance*=extent>1?Math.min(1.6,extent*1.01):Math.max(.65,extent);}baseCamera.copy(look).addScaledVector(direction,distance);}
 function resize(){if(!renderer||item.disposed)return;const rect=container.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const nextW=Math.round(rect.width),nextH=Math.round(rect.height);if(nextW===width&&nextH===height)return;width=nextW;height=nextH;const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.5:2);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);composer.setPixelRatio(dpr);composer.setSize(width,height);frameCamera();if(enabled)draw(currentTime);}
 function draw(time){
  if(!renderer||!width||!height||item.disposed||item.failed)return;
  currentTime=Math.max(0,Number(time)||0);
  const p=scrollProgress,sp=reduced?0:p,age=reduced||p>.015?model.duration:Math.max(0,currentTime-introStart),progress=reduced||p>.08?1:smooth(0,.65,currentTime-modeTime);
  const approach=smooth(.08,.25,p),middle=smooth(.40,.53,p),ending=smooth(.70,.80,p);
  for(let i=0;i<3;i++)weights[i]=lerp(modeFrom[i],i===mode?1:.36,progress);
  if(p>.08){
   if(type==='isolate')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],lerp(.66,1,middle)*(i===mode?1:lerp(.9,.63,ending)),approach);
   if(type==='accelerate')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],lerp(lerp(.7,1,middle),.09,ending),approach);
   if(type==='connect')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],i===0?lerp(lerp(1,.18,middle),.09,ending):i===1?lerp(lerp(.18,1,middle),.09,ending):lerp(.18,1.3,ending),approach);
  }
  model.stages.forEach((stage,i)=>{
   const q=1-smooth(stage.delay,.5+stage.delay+1.35,age);stage.group.position.copy(stage.offset).multiplyScalar(q);stage.group.rotation.set(0,0,0);
   if(type==='isolate'){stage.group.position.x+=(i-1)*.4*smooth(.18,.62,sp);stage.group.position.z+=(1-i)*.24*smooth(.2,.6,sp);}
   if(type==='accelerate'){stage.group.position.y+=(2-i)*.3*smooth(.14,.62,sp);stage.group.position.z+=(i-1)*.18*smooth(.2,.55,sp);}
  });
  if(model.details)for(const detail of model.details)detail.group.position.y=.36*smooth(.48,.82,sp);
  for(const signal of model.signals){
   const reveal=reduced?1.2:lerp(0,1.2,smooth(.18+signal.lane*.12,2.6+signal.lane*.12,age));
   for(const mat of[signal.mat,signal.haloMat]){
    mat.uniforms.uTime.value=reduced?3.4:currentTime;
    mat.uniforms.uProgress.value=reduced?Math.round(p*2):p;
    mat.uniforms.uWeight.value=weights[signal.lane];mat.uniforms.uReveal.value=reveal;
   }
  }
  for(const h of model.highlights){h.mat.color.copy(h.color).multiplyScalar(.55+weights[h.lane]*.35);h.mat.emissive.set('#538BCB');h.mat.emissiveIntensity=weights[h.lane]*.7;}
  const settle=1-smooth(0,4.5,age),offset=baseCamera.clone().sub(look),aim=look.clone();
  let yaw=model.cameraDrift[0]*settle,zoom=1;
  if(type==='isolate'){
   yaw+=lerp(-.1,.075,smooth(.42,.95,sp))*smooth(.04,.3,sp);zoom=1-.09*smooth(.04,.5,sp);
   aim.x-=.32*smooth(.10,.5,sp);aim.y+=.35*smooth(.7,1,sp);
  }else if(type==='accelerate'){
   yaw-=.11*smooth(.05,.68,sp);zoom=1-.055*smooth(.05,.55,sp);
   offset.y+=offset.length()*.047*smooth(.08,.55,sp);aim.x+=.45*smooth(.7,1,sp);
  }else{
   yaw-=.12*smooth(.1,.72,sp);zoom=1-.055*smooth(.1,.58,sp);
   const underground=smooth(.72,.88,sp);zoom-=.27*underground;aim.x+=.45*underground;aim.z+=1.5*underground;aim.y-=1.4*underground;offset.y-=offset.length()*.11*underground;
  }
  offset.applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(zoom);offset.y+=model.cameraDrift[1]*settle*offset.length();
  camera.position.copy(aim).add(offset);camera.lookAt(aim);cameraAim.copy(aim);
  // Camera-dependent softbox gradients describe the large metal faces during the dolly.
  composer.render();container.dataset.objectProgress=p.toFixed(3);
  container.dataset.objectAnimating=(!reduced&&!paused&&elapsed<runUntil)?'true':'false';
  container.dataset.objectMotion=paused?'paused':(!reduced&&elapsed<runUntil?'playing':'settled');
  if(!ready){ready=true;container.dataset.objectReady='true';delete container.dataset.objectError;if(typeof options.onReady==='function')options.onReady(api);}
 }
 function tick(stamp){raf=0;if(!enabled||paused||reduced||document.hidden||item.disposed||item.failed)return;if(last)elapsed=Math.min(runUntil,elapsed+Math.min(.06,(stamp-last)/1000));last=stamp;draw(elapsed);if(elapsed<runUntil)raf=requestAnimationFrame(tick);else{last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='settled';}}
 function schedule(){if(enabled&&!paused&&!reduced&&!document.hidden&&!raf&&!item.failed&&!item.disposed&&elapsed<runUntil){last=0;raf=requestAnimationFrame(tick);}}
 function activate(value){if(item.disposed||item.failed)return;const changed=enabled!==value;enabled=value;if(!value){if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;last=0;return;}if(!init())return;canvas.style.visibility='visible';if(changed||!ready){resize();draw(elapsed);}schedule();}
 function visibility(){chooseActive();}
 function fallbackVisibility(){const r=container.getBoundingClientRect();item.ratio=r.width&&r.height&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth?1:0;chooseActive();}
 function dispose(){if(item.disposed)return;item.disposed=true;cancelAnimationFrame(raf);raf=0;intersectionObserver?.disconnect();resizeObserver?.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',fallbackVisibility);window.removeEventListener('scroll',fallbackVisibility);canvas?.removeEventListener('webglcontextlost',contextLost);if(scene)releaseScene(scene);else floorMaterial.dispose();lighting?.environment.dispose();for(const p of composer?.passes||[])p.dispose?.();composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();canvas?.remove();registry.delete(item);mounted.delete(container);delete container.dataset.objectReady;delete container.dataset.objectMode;delete container.dataset.objectAnimating;delete container.dataset.objectMotion;delete container.dataset.objectProgress;container.style.position=originalPosition;if(active===item)active=null;chooseActive();}
 const api={setProgress(value){const next=clamp(Number(value)||0,0,1);if(Math.abs(next-scrollProgress)<.0001)return;scrollProgress=next;if(next>.015&&model){elapsed=Math.max(elapsed,model.duration);runUntil=elapsed;introStart=0;cancelAnimationFrame(raf);raf=0;last=0;}if(enabled&&init())draw(elapsed);},getState(){return{version:'27.0.7',type,progress:scrollProgress,mode,reducedMotion:reduced,ready,active:enabled,paused,failed:item.failed,fibers:model?.signals.reduce((a,b)=>a+b.count,0)||0,camera:camera?.position.toArray(),target:cameraAim.toArray()};},setMode(index){const next=clamp(Math.round(Number(index)||0),0,2);if(next===mode)return;modeFrom=[...weights];mode=next;modeTime=currentTime;runUntil=Math.max(runUntil,elapsed+1.05);container.dataset.objectMode=String(mode);if(enabled&&init()){draw(currentTime);schedule();}},replay(){if(item.disposed||item.failed)return;introStart=currentTime;runUntil=elapsed+(model?.duration||4.8);if(enabled&&init()){draw(currentTime);schedule();}},setPaused(value){paused=!!value;if(paused){cancelAnimationFrame(raf);raf=0;last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='paused';}else{if(enabled&&renderer)draw(currentTime);schedule();}},dispose,getAnchors(){if(!model||!camera||!width||!height)return null;model.root.updateMatrixWorld(true);camera.updateMatrixWorld();const project=p=>{const v=new THREE.Vector3(...p).applyMatrix4(model.root.matrixWorld).project(camera);return{x:(v.x+1)/2,y:(1-v.y)/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};};const pts=model.anchors[mode];return{type,mode,start:project(pts.start),end:project(pts.end)};},render(time){if(item.disposed||item.failed||!enabled)return;if(init()){if(Number.isFinite(time))elapsed=Math.max(0,time);draw(elapsed);}}};
 registry.add(item);mounted.set(container,api);container.dataset.objectMode='0';document.addEventListener('visibilitychange',visibility);if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);}if('IntersectionObserver'in window){intersectionObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.target===container)item.ratio=e.isIntersecting?e.intersectionRatio:0;chooseActive();},{threshold:[0,.01,.1,.25,.5,.75,1]});intersectionObserver.observe(container);}else window.addEventListener('scroll',fallbackVisibility,{passive:true});window.addEventListener('resize',fallbackVisibility,{passive:true});fallbackVisibility();return api;
}
export {isolate,accelerate,connect,mount};
if(typeof window!=='undefined')window.ARADObjects={mount,version:'27.0.7'};
