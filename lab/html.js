// Vite may append cache-busting timestamps before/after HTML hooks. Match the URL, not its spelling.
export function rewriteLabEntry(html,path=''){
 if(path==='/lab/'||path==='/lab/index.html')return html;
 return html.replace(/(<script\b[^>]*\bsrc\s*=\s*)(["'])\/src\/bootstrap\.js(?:[?#][^"']*)?\2/gi,(_,prefix,quote)=>prefix+quote+'/lab/entry.js'+quote);
}
