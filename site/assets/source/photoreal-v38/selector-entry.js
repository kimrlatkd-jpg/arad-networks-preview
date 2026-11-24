import {mount as mountScene} from './photoreal-core.js';
window.ARADSelectorObjects={version:'38.0.0',mount(container,options={}){return mountScene(container,{...options,selector:true});}};
