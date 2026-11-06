/**
 * Render the EXACT static hologram viewer in headless Chromium and keep visual
 * evidence for human QA. Run against a local server (no credentials required).
 *
 * npm install --no-save playwright@1.57.0
 * python3 -m http.server 8765 --directory public
 * HOLOGRAM_TEST_BASE=http://127.0.0.1:8765 node tools/hologram/capture-light-preview.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base=process.env.HOLOGRAM_TEST_BASE || "http://127.0.0.1:8765";
const out=resolve("artifacts/hologram-light");
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  "--enable-webgl","--use-gl=angle","--use-angle=swiftshader",
  "--enable-unsafe-swiftshader","--disable-web-security"
]});
let errors=0;
try{
  for(const character of ["lina","bob"]){
    const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
    const reported=[];
    page.on("pageerror",error=>reported.push("pageerror: "+error.message));
    page.on("console",message=>{if(message.type()==="error")reported.push("console: "+message.text())});
    await page.goto(base+"/hologram-engine/engine.html?character="+character,{waitUntil:"domcontentloaded"});
    await page.waitForTimeout(9000);
    const result=await page.evaluate(()=>{
      const canvas=document.querySelector("canvas");
      if(!canvas)return {canvas:false};
      const gl=canvas.getContext("webgl2") || canvas.getContext("webgl");
      if(!gl)return {canvas:true,webgl:false};
      const sample=new Uint8Array(4);
      const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
      // With the default drawingBuffer preservation, alpha still helps spot
      // an all-black screen; screenshot is the decisive human review.
      gl.readPixels(Math.floor(width/2),Math.floor(height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample);
      return {canvas:true,webgl:true,width,height,centerPixel:Array.from(sample)};
    });
    const screenshot=out+"/"+character+"-portrait.png";
    await page.screenshot({path:screenshot,fullPage:true});
    console.log(JSON.stringify({character,...result,reported,screenshot}));
    if(!result.canvas||!result.webgl||reported.some(msg=>/failed|uncaught|syntaxerror|cannot|webgl render initialization/i.test(msg)))errors++;
    await page.close();
  }
}finally{await browser.close()}
if(errors)process.exitCode=1;
