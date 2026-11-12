// Optional localhost fallback. Uses only Node.js built-in modules.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(req.url.split('?')[0])}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
 const allowed=new Set(['index.html','style.css','game.js']);
 if(path.dirname(file)!==root||!allowed.has(path.basename(file))){res.writeHead(404).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8'})[file.split('.').pop()]);res.end(data)});
});
server.on('error',err=>console.error('Cannot start local server:',err.message));
server.listen(8127,'127.0.0.1',()=>console.log('Blade Orbit bycodex: http://127.0.0.1:8127 — close this window to stop.'));
