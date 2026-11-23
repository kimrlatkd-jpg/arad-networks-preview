/* Shared ARAD V34 product forms. Based on supplied product photographs, not dimensional CAD. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { logoPaths } from './logo-paths.js';

function block(g,size,p,m,r=0){const geo=r?new RoundedBoxGeometry(...size,2,Math.min(r,Math.min(...size)*.25)):new THREE.BoxGeometry(...size);const mesh=new THREE.Mesh(geo,m);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=false;g.add(mesh);return mesh;}
function group(parent,position){const g=new THREE.Group();g.position.set(...position);parent.add(g);return g;}
const kitMat=(m,name)=>m[name]||m.silver||m.navy;
let logoTexture;
function dashboardTexture(){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=1440;c.height=840;const x=c.getContext('2d');
 const rect=(a,b,w,h,fill,stroke)=>{x.fillStyle=fill;x.fillRect(a,b,w,h);if(stroke){x.strokeStyle=stroke;x.lineWidth=1;x.strokeRect(a+.5,b+.5,w-1,h-1);}};
 const text=(s,a,b,size=15,color='#93a8c2',weight=400)=>{x.font=`${weight} ${size}px Arial, sans-serif`;x.fillStyle=color;x.fillText(s,a,b);};
 const line=(pts,color='#315173',width=1)=>{x.beginPath();pts.forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));x.strokeStyle=color;x.lineWidth=width;x.stroke();};
 rect(0,0,1440,840,'#080f1c');rect(0,0,210,840,'#0e1a2d');rect(209,0,1,840,'#273b55');
 text('ARAD',32,61,29,'#dce6f5',600);text('NETWORKS',33,81,10,'#7e9abc',500);
 for(const[s,i]of[['Overview',0],['Topology',1],['Devices',2],['Connections',3],['Resources',4]]){
  if(i===0)rect(18,124+i*55,173,41,'#172c4c');rect(35,139+i*55,10,10,i===0?'#7ab5ff':'#405778');text(s,61,151+i*55,16,i===0?'#d4e5fc':'#7f96b5');
 }
 text('CONCEPT VIEW',31,790,11,'#526987',500);text('Network overview',251,64,29,'#e0e8f4',500);text('Connected devices and service paths',252,91,15,'#7087a5');
 line([[251,113],[1394,113]],'#24364f');
 const titles=['Service gateways','Point gateways','Active paths'];
 for(let k=0;k<3;k++){
  const a=251+k*386;rect(a,139,365,145,'#101d30','#263a53');text(titles[k],a+23,173,16,'#8fa4bf');
  for(let j=0;j<11;j++)rect(a+24+j*26,205+(j%3)*3,18,35-(j%3)*3,j<7?'#467fbf':'#233a56');
  line([[a+24,257],[a+338,257]],'#2e4969');
 }
 rect(251,310,730,457,'#0e192a','#263a53');text('Connection topology',277,345,18,'#bdcce0',500);text('Device-level service paths',277,371,13,'#637e9f');
 const nodes=[[612,455,'Service'],[432,557,'Gateway'],[791,557,'Gateway'],[346,675,'Device'],[515,675,'Device'],[706,675,'Device'],[879,675,'Device']];
 for(const[a,b]of[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]])line([[nodes[a][0],nodes[a][1]+10],[nodes[a][0],(nodes[a][1]+nodes[b][1])/2],[nodes[b][0],(nodes[a][1]+nodes[b][1])/2],[nodes[b][0],nodes[b][1]-17]],'#3e78b5',2);
 for(const[a,b,label]of nodes){rect(a-40,b-22,80,39,'#183458','#4b79a8');for(let k=0;k<5;k++)rect(a-26+k*11,b-9,7,5,'#9cbbdf');text(label,a-24,b+40,12,'#7a94b7');}
 rect(1005,310,404,233,'#0e192a','#263a53');text('Traffic flow',1030,345,18,'#bdcce0',500);
 for(let i=0;i<4;i++)line([[1031,384+i*36],[1383,384+i*36]],'#20334e');
 const graph=[];for(let i=0;i<45;i++)graph.push([1031+i*8,461-Math.sin(i*.29)*22-Math.sin(i*.89)*13-i*.6]);line(graph,'#5b9de4',2.5);
 rect(1005,566,404,201,'#0e192a','#263a53');text('Connected equipment',1030,602,18,'#bdcce0',500);
 for(const[label,i]of[['ARAD Controller',0],['Service Gateway',1],['Point Gateway',2]]){rect(1031,627+i*38,7,7,'#5692cc');text(label,1055,636+i*38,14,'#8ca7c8');line([[1030,650+i*38],[1383,650+i*38]],'#1f3149');}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function addBrand(parent,m,{width=.4,position=[0,0,0]}={}){
 if(typeof document==='undefined'||typeof Path2D==='undefined')return null;
 if(!logoTexture){const c=document.createElement('canvas');c.width=792;c.height=472;const ctx=c.getContext('2d');ctx.scale(4,4);ctx.fillStyle='#e4e9f2';for(const d of logoPaths)ctx.fill(new Path2D(d));logoTexture=new THREE.CanvasTexture(c);logoTexture.colorSpace=THREE.SRGBColorSpace;}
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*117.667/198),new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.position.set(...position);parent.add(mesh);return mesh;
}
export function addController(parent,m,{width=2.56,height=.48,depth=1.65,position=[0,0,0]}={}){
 const g=group(parent,position),w=width,h=height,d=depth,z=d/2;
 g.userData.product='ARAD Controller';
 block(g,[w,h,d],[0,0,0],kitMat(m,'silver'),.025);
 block(g,[w-.055,h-.06,.05],[0,0,z+.015],kitMat(m,'dark'),.009);
 block(g,[w-.08,.032,d-.06],[0,h/2+.009,-.015],kitMat(m,'brushed'),.008);
 // Two independently recessed ventilation panels on the left, as on the supplied Controller.
 for(let panel=0;panel<2;panel++){
  const pw=w*.28,cx=-w*.33+panel*w*.292;
  block(g,[pw,h*.74,.035],[cx,0,z+.05],kitMat(m,'etched'),.008);
  block(g,[pw-.035,h*.65,.015],[cx,0,z+.072],kitMat(m,'inset'));
  for(let x=0;x<20;x++)block(g,[pw/75,h*.60,.015],[cx-pw*.45+x*pw*.9/19,0,z+.084],kitMat(m,'brushed'));
  for(let y=0;y<3;y++)block(g,[pw*.92,h*.022,.014],[cx,-h*.2+y*h*.2,z+.087],kitMat(m,'dark'));
 }
 // Eight hot-swap drive carriers, each with a narrow recessed grip and restrained status slot.
 for(let bay=0;bay<8;bay++){
  const bw=w*.047,cx=w*.102+bay*w*.0485;
  block(g,[bw,h*.76,.065],[cx,0,z+.047],kitMat(m,'brushed'),.005);
  block(g,[bw*.72,h*.68,.018],[cx,0,z+.086],kitMat(m,'inset'),.003);
  block(g,[bw*.68,h*.06,.025],[cx,-h*.2,z+.10],kitMat(m,'silver'),.003);
  block(g,[bw*.19,h*.055,.012],[cx,h*.235,z+.101],kitMat(m,'navy'));
 }
 for(const side of[-1,1]){
  block(g,[w*.026,h*.88,.10],[side*w*.478,0,z+.065],kitMat(m,'dark'),.012);
  block(g,[w*.009,h*.48,.055],[side*w*.482,0,z+.125],kitMat(m,'edge'),.004);
 }
 // Brand belongs to the physical faceplate; it never enters separately.
 addBrand(g,m,{width:w*.065,position:[-w*.02,h*.355,z+.095]});
 return g;
}
export function addGateway(parent,m,{width=2.56,height=.24,depth=1.35,position=[0,0,0]}={}){
 const g=group(parent,position),w=width,h=height,d=depth,z=d/2;g.userData.product='Service Gateway';
 block(g,[w,h,d],[0,0,0],kitMat(m,'navy'),.018);
 block(g,[w-.03,h*.86,.035],[0,0,z+.012],kitMat(m,'brushed'),.006);
 block(g,[w*.91,h*.74,.017],[-w*.018,0,z+.038],kitMat(m,'inset'));
 for(let row=0;row<2;row++)for(let port=0;port<24;port++){
  const pw=w*.033,cx=-w*.43+port*w*.0367,cy=(row?1:-1)*h*.19;
  block(g,[pw,h*.32,.025],[cx,cy,z+.055],kitMat(m,'silver'));
  block(g,[pw*.72,h*.22,.015],[cx,cy+.002,z+.073],kitMat(m,'inset'));
  block(g,[pw*.42,h*.028,.012],[cx,cy-h*.10,z+.085],kitMat(m,'brushed'));
 }
 for(const side of[-1,1])block(g,[w*.028,h*.8,.055],[side*w*.48,0,z+.06],kitMat(m,'dark'),.004);
 addBrand(g,m,{width:w*.055,position:[w*.414,h*.34,z+.067]});
 return g;
}
export function addPointGateway(parent,m,{width=1.1,height=.3,depth=.7,position=[0,0,0]}={}){
 const g=group(parent,position),w=width,h=height,d=depth,z=d/2;g.userData.product='Point Gateway';
 block(g,[w,h,d],[0,0,0],kitMat(m,'silver'),.035);block(g,[w*.94,.015,d*.94],[0,h*.51,0],kitMat(m,'brushed'),.015);
 for(let p=0;p<4;p++){const x=-w*.06+p*w*.14;block(g,[w*.12,h*.46,.035],[x,0,z+.008],kitMat(m,'navy'),.004);block(g,[w*.09,h*.29,.018],[x,0,z+.03],kitMat(m,'inset'));}
 block(g,[w*.13,h*.36,.03],[-w*.32,0,z+.016],kitMat(m,'dark'),.008);
 for(let j=0;j<5;j++)block(g,[.014,h*.12,d*.7],[-w*.505,-h*.2+j*h*.095,0],kitMat(m,'inset'));
 const brand=addBrand(g,m,{width:w*.24,position:[0,h*.515,.03]});if(brand)brand.rotation.x=-Math.PI/2;
 return g;
}
export function addMonitor(parent,m,{width=4.5,height=2.9,depth=.18,position=[0,0,0]}={}){
 const g=group(parent,position),w=width,h=height,d=depth,z=d/2;g.userData.product='Network concept display';
 block(g,[w,h,d],[0,0,0],kitMat(m,'brushed'),.055);
 block(g,[w*.965,h*.95,.025],[0,0,z+.009],kitMat(m,'inset'),.018);
 const screenKit=Object.fromEntries(Object.entries({navy:'#244c80',dark:'#101c2e',brushed:'#607d9f',edge:'#73b1ee',etched:'#1c304b'}).map(([key,color])=>[key,new THREE.MeshBasicMaterial({color})]));
 const ui=group(g,[0,0,z+.03]);
 block(ui,[w*.11,h*.86,.012],[-w*.417,0,0],kitMat(screenKit,'navy'),.008);
 for(let i=0;i<6;i++)block(ui,[w*.064,h*.014,.012],[-w*.417,h*.29-i*h*.093,.009],kitMat(screenKit,'brushed'));
 // Abstract device cards and network topology: no invented metrics or Cisco branding.
 for(let card=0;card<3;card++){
  const cx=-w*.235+card*w*.255;
  block(ui,[w*.229,h*.22,.015],[cx,h*.29,0],kitMat(screenKit,'dark'),.015);
  block(ui,[w*.11,h*.012,.015],[cx-w*.035,h*.34,.014],kitMat(screenKit,'brushed'));
  for(let b=0;b<8;b++)block(ui,[w*.012,h*(.04+.08*((b*3+card)%7)/7),.016],[cx-w*.075+b*w*.021,h*.215,.016],kitMat(screenKit,b%3===0?'edge':'navy'));
 }
 block(ui,[w*.47,h*.53,.015],[-w*.11,-h*.125,0],kitMat(screenKit,'dark'),.015);
 block(ui,[w*.229,h*.53,.015],[w*.275,-h*.125,0],kitMat(screenKit,'dark'),.015);
 const pts=[[-.25,.02],[-.12,.16],[.02,.02],[-.12,-.15],[-.28,-.25],[.04,-.27]];
 for(const[a,b]of[[0,1],[1,2],[1,3],[3,4],[3,5]]){const x1=pts[a][0]*w,y1=pts[a][1]*h-h*.10,x2=pts[b][0]*w,y2=pts[b][1]*h-h*.10;const line=block(ui,[Math.hypot(x2-x1,y2-y1),.009,.009],[(x1+x2)/2,(y1+y2)/2,.03],kitMat(screenKit,'brushed'));line.rotation.z=Math.atan2(y2-y1,x2-x1);}
 for(const[x,y]of pts){block(ui,[w*.05,h*.055,.015],[x*w,y*h-h*.10,.04],kitMat(screenKit,'navy'),.007);block(ui,[w*.021,h*.012,.016],[x*w,y*h-h*.10,.055],kitMat(screenKit,'edge'));}
 for(let row=0;row<5;row++){block(ui,[w*.175,h*.047,.015],[w*.275,h*.04-row*h*.075,.025],kitMat(screenKit,'etched'),.004);block(ui,[w*.085,h*.01,.017],[w*.26,h*.04-row*h*.075,.04],kitMat(screenKit,'brushed'));}
 const dashboard=dashboardTexture();if(dashboard){ui.visible=false;const screen=new THREE.Mesh(new THREE.PlaneGeometry(w*.946,h*.922),new THREE.MeshBasicMaterial({map:dashboard}));screen.position.set(0,0,z+.065);g.add(screen);}
 block(g,[w*.09,h*.26,depth*1.4],[0,-h*.58,-.10],kitMat(m,'dark'),.025);block(g,[w*.37,.06,w*.15],[0,-h*.72,.02],kitMat(m,'brushed'),.025);
 return g;
}
