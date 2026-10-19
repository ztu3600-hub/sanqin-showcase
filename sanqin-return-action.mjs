// Use the template's button, link resolver and motion variants unchanged.
import {l as jsx,M as useMemo} from '/sanqin-showcase/assets/framerusercontent.com/sites/6M0TrzDLnXQQXV79p8g41O/react.BcaIDK9K.mjs';
import {g as initializeButton,h as MainButton} from '/sanqin-showcase/assets/framerusercontent.com/sites/6M0TrzDLnXQQXV79p8g41O/shared-lib.C1PpSnLV.mjs';
export function SanqinReturnAction(props){
 initializeButton();
 const history=window.__sanqinHistory;
 const entryKey=history?.entryKey();
 const isReturn=props.gVIzv1Jnb?.startsWith('返回');
 const source=useMemo(()=>isReturn?history?.source():null,[entryKey,isReturn]);
 if(!isReturn)return jsx(MainButton,props);
 const returnProps=source?{xt9sv8vCj:undefined,role:'button',tabIndex:0,onClick:()=>history.back(source),onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();history.back(source)}}}:{xt9sv8vCj:props.xt9sv8vCj||'/#top'};
 return jsx(MainButton,{...props,...returnProps,gVIzv1Jnb:'返回页面','aria-label':'返回页面','data-brand-return-button':true,'data-sanqin-return-button':true,'data-sanqin-entry-key':entryKey,'data-sanqin-source-key':source?.key});
}
