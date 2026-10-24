// Deterministic frames exercise the real video -> worker -> OpenCV path.
export function createDemo(){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');let values=[1,2,3,4,5],picked=false,timer=null;
 const positions={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
 function paint(){ctx.fillStyle='#122346';ctx.fillRect(0,0,960,540);ctx.strokeStyle='#597294';ctx.lineWidth=4;ctx.strokeRect(60,60,840,420);values.forEach((v,i)=>{if(picked&&i>1)return;const x=180+i*145,y=270;ctx.fillStyle='#f0f0e6';ctx.fillRect(x-34,y-34,68,68);ctx.fillStyle='#101010';for(const [px,py]of positions[v]){ctx.beginPath();ctx.arc(x+px*17,y+py*17,5.5,0,Math.PI*2);ctx.fill();}});}
 paint();const ticker=setInterval(paint,50),stream=canvas.captureStream(20);
 return {stream,reroll(){picked=true;clearTimeout(timer);timer=setTimeout(()=>{values=[values[0],values[1],6,1,5];picked=false;},2000);},stop(){clearInterval(ticker);clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());}};
}
