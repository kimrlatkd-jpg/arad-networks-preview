import {mount as mountScene} from './photoreal-core.js';
window.ARADObjects={version:'36.0.0',mount(container,options={}){return mountScene(container,{...options,selector:false});}};
