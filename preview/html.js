export function rewritePreviewEntry(html){
 return html.replace(/(<script\b[^>]*\bsrc\s*=\s*)(["'])\/src\/bootstrap\.js(?:[?#][^"']*)?\2/gi,(_,prefix,quote)=>prefix+quote+'/preview/entry.js'+quote);
}
