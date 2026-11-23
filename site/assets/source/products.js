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

// V35: a standalone modular chassis, based on the supplied blade-equipment silhouette.
// This is an authored concept form, not product CAD or a claim about ARAD hardware specifications.
export function addAcceleratorChassis(parent,m,{width=10.4,height=5.5,depth=3.0,position=[0,0,0],includeDetached=true}={}){
 const g=group(parent,position),w=width,h=height,d=depth,z=d/2;
 g.userData.product='Accelerate modular chassis';
 const metal=kitMat(m,'silver'),edge=kitMat(m,'edge'),brushed=kitMat(m,'brushed'),navy=kitMat(m,'navy'),dark=kitMat(m,'dark'),inset=kitMat(m,'inset'),etched=kitMat(m,'etched');
 // Shallow broad shell with substantial side panels, rather than rack posts.
 block(g,[w,h,d],[0,0,-.03],navy,.075);
 block(g,[w-.16,.11,d-.1],[0,h/2+.015,-.03],brushed,.025);
 block(g,[w-.28,h-.35,.08],[0,0,z+.016],inset,.018);
 for(const x of[-w/2+.14,w/2-.14]){
  block(g,[.28,h+.03,.29],[x,.015,z+.04],metal,.028);
  block(g,[.045,h-.18,.035],[x-.07,.015,z+.203],edge,.007);
 }
 for(const y of[-h/2+.13,h/2-.12]){
  block(g,[w-.30,.25,.34],[0,y,z+.045],metal,.022);
  block(g,[w-.50,.025,.025],[0,y+(y>0?-.078:.078),z+.224],edge,.005);
 }
 // Brushed top cover, subtle repeated machining lines and a narrow rear ventilation band.
 for(let i=0;i<34;i++)block(g,[.026,.012,d*.64],[-w*.44+i*w*.88/33,h/2+.078,-.15],etched);
 for(let i=0;i<15;i++)block(g,[.025,h*.47,.024],[w/2+.018,-.06,-d*.37+i*d*.73/14],inset);
 const bladeCount=8,bladeStart=-w*.414,step=w*.096,bw=w*.084,bh=h*.842,blades=[];
 for(let i=0;i<bladeCount;i++){
  const b=group(g,[bladeStart+i*step,-.035,0]);b.userData.product='Vertical compute module';b.userData.slot=i;
  // Separate cartridge bodies remain visible when the last scroll chapter withdraws a module.
  block(b,[bw,bh,d*.86],[0,0,-.03],dark,.025);
  block(b,[bw*.92,bh*.99,.11],[0,0,z+.07],metal,.014);
  block(b,[bw*.79,bh*.94,.035],[0,0,z+.136],brushed,.009);
  for(const side of[-1,1])block(b,[bw*.045,bh*.96,.042],[side*bw*.455,0,z+.145],edge,.004);
  // Three finely recessed port/vent fields read as one tall blade, not stacked servers.
  for(let band=0;band<3;band++){
   const yy=bh*.303-band*bh*.302;
   block(b,[bw*.65,bh*.228,.018],[0,yy,z+.160],inset,.008);
   for(let row=0;row<10;row++)for(let col=0;col<4;col++){
    block(b,[bw*.105,bh*.009,.012],[-bw*.213+col*bw*.142,yy-bh*.094+row*bh*.0205,z+.174],etched);
   }
   // Discrete front sockets along one edge give each module a precise hardware scale.
   for(let port=0;port<3;port++){
    block(b,[bw*.19,bh*.039,.027],[bw*.04,yy-bh*.025+port*bh*.054,z+.185],metal,.003);
    block(b,[bw*.135,bh*.025,.015],[bw*.04,yy-bh*.025+port*bh*.054,z+.205],inset,.002);
   }
  }
  // Solid top and bottom ejector handles with inset grips.
  for(const side of[-1,1]){
   const yy=side*bh*.445;
   block(b,[bw*.58,.08,.17],[0,yy,z+.215],dark,.012);
   block(b,[bw*.56,.035,.055],[0,yy+side*.026,z+.307],edge,.006);
   block(b,[bw*.11,.085,.065],[-bw*.38,yy,z+.20],navy,.006);
  }
  block(b,[bw*.045,bh*.70,.018],[-bw*.365,0,z+.178],navy,.003);
  block(b,[bw*.24,.026,.022],[bw*.19,bh*.398,z+.199],navy,.003);
  for(let j=0;j<5;j++)block(b,[d*.09,.035,bw*.86],[0,bh*.50+.022,-d*.30+j*d*.135],brushed,.004).rotation.y=Math.PI/2;
  blades.push(b);
 }
 const rightX=w*.416,rightW=w*.123;
 block(g,[rightW,h*.85,.13],[rightX,-.035,z+.07],brushed,.018);
 // Two larger power / cooling cartridges in the right-hand service column.
 for(let k=0;k<2;k++){
  const yy=h*.217-k*h*.444;
  block(g,[rightW*.81,h*.398,.045],[rightX,yy,z+.153],dark,.013);
  for(let row=0;row<21;row++)for(let col=0;col<5;col++)block(g,[rightW*.103,.025,.014],[rightX-rightW*.267+col*rightW*.1335,yy-h*.164+row*h*.0164,z+.183],etched);
  block(g,[rightW*.53,.065,.12],[rightX,yy-h*.15,z+.228],metal,.009);
  for(const x of[-1,1])block(g,[.042,h*.05,.10],[rightX+x*rightW*.25,yy-h*.13,z+.222],edge,.006);
 }
 // ARAD is engraved on the machine's own header from the first frame.
 block(g,[w*.18,.25,.032],[w*.315,h/2-.12,z+.226],navy,.006);
 addBrand(g,m,{width:w*.085,position:[w*.315,h/2-.12,z+.248]});
 // Low integral feet and a fine machined bottom edge, no rack plinth.
 for(const x of[-w*.37,w*.37])for(const zz of[-d*.31,d*.31])block(g,[w*.10,.17,d*.15],[x,-h/2-.085,zz],dark,.025);
 block(g,[w-.20,.075,.25],[0,-h/2-.015,z+.08],navy,.012);
 let detached=null,detachedHome=null;
 if(includeDetached){
  detached=group(g,[w*.16,-h/2-.045,z+1.32]);detached.rotation.y=-.075;detached.userData.product='Removed line card';
  const cw=w*.66,ch=.33,cd=1.12;
  block(detached,[cw,ch,cd],[0,0,0],metal,.022);
  block(detached,[cw*.97,ch*.85,.08],[0,0,cd/2+.02],dark,.008);
  block(detached,[cw*.96,.035,cd*.82],[0,ch/2+.013,-.015],brushed,.008);
  for(let p=0;p<24;p++){
   const xx=-cw*.455+p*cw*.91/23;
   block(detached,[cw*.031,ch*.66,.035],[xx,0,cd/2+.07],brushed,.003);
   block(detached,[cw*.024,ch*.49,.02],[xx,0,cd/2+.092],inset,.002);
   block(detached,[cw*.016,.015,.016],[xx,-ch*.21,cd/2+.105],edge,.002);
  }
  for(const side of[-1,1]){
   block(detached,[.17,ch*1.18,.28],[side*(cw/2+.05),0,cd/2],brushed,.014);
   block(detached,[.09,ch*.73,.10],[side*(cw/2+.12),0,cd/2+.17],edge,.008);
  }
  for(let i=0;i<18;i++)block(detached,[cw*.026,.07,cd*.57],[-cw*.42+i*cw*.84/17,ch/2+.053,-.07],dark,.003);
  const logo=addBrand(detached,m,{width:.50,position:[cw*.34,ch/2+.055,-.12]});if(logo)logo.rotation.x=-Math.PI/2;
  detachedHome=detached.position.clone();
 }
 return{group:g,blades,detached,detachedHome,width:w,height:h,depth:d,bladeCenters:blades.map(b=>b.position.x)};
}
