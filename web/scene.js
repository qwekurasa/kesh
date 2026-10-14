// Живая сцена на WebGL: облачное море со светящейся рекой, холм в цветах и пушистый Кэш на вершине.
// Всё рисуется шейдером — без картинок и библиотек. Кэш объёмный (raymarching), шерсть шевелит ветер.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = `
precision highp float;
uniform vec2 R; uniform float T; uniform vec2 M; uniform float Z; uniform float H;
#define CAT vec2(0.0,-0.205)
#define CS 0.15

float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.+i.z*113.;
  return mix(mix(mix(h1(n),h1(n+1.),f.x),mix(h1(n+57.),h1(n+58.),f.x),f.y),mix(mix(h1(n+113.),h1(n+114.),f.x),mix(h1(n+170.),h1(n+171.),f.x),f.y),f.z);}

float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdE(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}

// Кэш со спины: сидит, хвост лежит на траве и чуть качается
float cat(vec3 p,out float fur){
  float t=T;
  float sway=sin(t*1.3)*.05;
  float b=sdE(p-vec3(0.,.36,0.),vec3(.31,.37,.27));
  b=smin(b,sdE(p-vec3(0.,.15,.02),vec3(.39,.2,.31)),.12);
  vec3 hp=p-vec3(sway*.3,.86,.02);
  float hd=sdE(hp,vec3(.25,.22,.23));
  vec3 e=hp;e.x=abs(e.x);e-=vec3(.15,.2,0.);
  e.xy=mat2(.92,-.38,.38,.92)*e.xy;
  hd=smin(hd,sdE(e,vec3(.075,.14,.045)),.05);
  b=smin(b,hd,.1);
  vec3 a=vec3(.26,.06,.12),c=vec3(.56,.03,.2),d=vec3(.74+sway,.16,.14);
  float tl=min(sdCap(p,a,c,.065),sdCap(p,c,d,.058));
  b=smin(b,tl,.06);
  // шерсть: шум по поверхности + порывы ветра слева направо
  vec3 w=p*vec3(9.,13.,9.)+vec3(-t*1.6,sin(t*.7)*.4,0.);
  fur=n3(w)*.65+n3(w*2.1+3.)*.35;
  float gust=.5+.5*sin(t*1.6+p.y*3.);
  return b-.022*fur-.01*gust*smoothstep(.2,1.,p.y);
}

vec3 sky(vec2 uv){
  float y=uv.y;
  vec3 top=vec3(.035,.04,.11),mid=vec3(.12,.11,.27),low=vec3(.42,.27,.36);
  vec3 c=mix(mid,top,smoothstep(.0,.5,y));
  c=mix(low,c,smoothstep(-.02,.22,y));
  vec2 s=uv*vec2(260.,260.);
  float st=step(.993,h2(floor(s)))*(.55+.45*sin(T*2.+h2(floor(s))*40.))*smoothstep(.5,.1,length(fract(s)-.5));
  c+=st*smoothstep(.05,.3,y)*.9;
  float band=exp(-pow((y-.26-.08*sin(uv.x*2.+1.))*7.,2.));
  c+=vec3(.25,.55,.5)*band*.18*fbm(uv*vec2(3.,8.)+vec2(T*.02,0.));
  c+=vec3(1.,.82,.6)*exp(-length(uv-vec2(.55,.33))*9.)*.35;
  c+=vec3(1.,.95,.85)*smoothstep(.028,.022,length(uv-vec2(.55,.33)));
  return c;
}

// Море облаков с рекой света
vec3 clouds(vec2 uv,inout float glow){
  float hz=.05;
  float dep=.09/max(hz-uv.y,.004);
  vec2 w=vec2(uv.x*dep,dep);
  float rx=.32*sin(w.y*2.1+.4)+.14*sin(w.y*4.3+1.3)+.05*w.y;
  float d=abs(w.x-rx)/(.045+.018*w.y);
  float riv=exp(-d*d*1.6);
  float wide=exp(-d*d*.08);
  glow=riv;
  vec2 q=w*vec2(.9,1.)+vec2(T*.05,T*.03);
  float cl=fbm(q*1.6);
  vec3 base=mix(vec3(.16,.14,.32),vec3(.5,.45,.7),cl);
  base=mix(base,vec3(.42,.3,.4),smoothstep(.0,.1,uv.y+.02)*.6);
  vec3 c=base*(.45+.55*cl)+vec3(.35,.6,.6)*wide*cl*.35;
  c+=vec3(.55,1.,.82)*riv*.6+vec3(1.,.88,.7)*pow(riv,5.)*.8;
  vec2 sp=w*vec2(55.,22.);
  vec2 fs=fract(sp)-.5;
  float dotm=smoothstep(.22,0.,length(fs*vec2(1.,2.5)));
  float tw=step(.8,h2(floor(sp)))*(.5+.5*sin(T*3.+h2(floor(sp)+3.)*30.))*dotm;
  c+=vec3(.75,1.,.92)*tw*(riv*1.6+wide*.25);
  c+=vec3(.9,.95,1.)*pow(cl,4.)*.35;
  float fog=smoothstep(.0,.06,hz-uv.y);
  return mix(sky(uv)*1.1,c,fog);
}

float crest(float x){return -.205-.55*x*x-.03*x*x*x*x+.012*(fbm(vec2(x*6.,1.))-.5);}

vec3 ground(vec2 uv,float top){
  float dpt=top-uv.y;
  vec3 c=mix(vec3(.07,.12,.1),vec3(.02,.04,.04),smoothstep(0.,.3,dpt));
  c+=vec3(.25,.55,.45)*exp(-dpt*40.)*.35;
  // цветы: ячейки с цветком, ближе к зрителю — крупнее
  for(int k=0;k<3;k++){
    float s=24.+float(k)*20.;
    vec2 g=uv*vec2(s,s*1.8)+float(k)*7.;
    vec2 id=floor(g);vec2 f=fract(g)-.5;
    float r=h2(id+float(k));
    vec2 o=vec2(h2(id+11.)-.5,h2(id+5.)-.5)*.6+vec2(sin(T*1.5+id.y+id.x*.3)*.08,0.);
    float fl=smoothstep(.2,.04,length(f-o))*step(.62,r)*smoothstep(-.6,-.25,uv.y-float(k)*.1);
    vec3 col=mix(vec3(.85,.65,1.),vec3(1.,.75,.88),h2(id+2.));
    col=mix(col,vec3(1.,.97,.92),step(.85,h2(id+9.)));
    c=mix(c,col*(.35+.65*exp(-dpt*6.)),fl*.9);
  }
  return c;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  uv=CAT+vec2(0.,.08)+(uv-CAT-vec2(0.,.08))/(1.+Z*3.2);
  vec2 par=M*.012;
  float glow=0.;
  vec3 c=uv.y>.05+par.y?sky(uv+par):clouds(uv+par*.6,glow);
  float top=crest(uv.x)+.006*sin(uv.x*90.+T*2.)*fbm(vec2(uv.x*40.,T*.5));
  if(uv.y<top) c=ground(uv,top);
  // травинки по гребню колышутся
  float gr=fbm(vec2(uv.x*260.,0.))*.018*(.6+.4*sin(T*2.+uv.x*30.));
  if(uv.y<top+gr&&uv.y>=top) c=mix(c,vec3(.04,.07,.06),.85);
  // Кэш
  vec2 lp=(uv-CAT)/CS;
  float halo=0.;
  if(abs(lp.x-.2)<1.2&&lp.y>-.2&&lp.y<1.4){
    vec3 ro=vec3(lp,2.),rd=vec3(0.,0.,-1.);
    float t=0.,md=9.,fur=0.;bool hit=false;
    for(int i=0;i<56;i++){vec3 p=ro+rd*t;float d=cat(p,fur);md=min(md,d);if(d<.002){hit=true;break;}t+=d*.9;if(t>4.)break;}
    if(hit){
      vec3 p=ro+rd*t;float f2;vec2 e=vec2(.004,0.);
      vec3 n=normalize(vec3(cat(p+e.xyy,f2)-cat(p-e.xyy,f2),cat(p+e.yxy,f2)-cat(p-e.yxy,f2),cat(p+e.yyx,f2)-cat(p-e.yyx,f2)));
      float rim=pow(1.-max(n.z,0.),2.6);
      float fill=.5+.5*n.y;
      vec3 alb=vec3(.9,.9,.94)*(.82+.18*fur);
      float moon=max(dot(n,normalize(vec3(.7,.5,.3))),0.);
      vec3 col=alb*(.12+.16*fill)+alb*vec3(1.,.9,.8)*moon*.22+vec3(.62,1.,.85)*rim*1.2+vec3(1.,.88,.7)*pow(rim,5.)*.9;
      col*=.85+.3*fur;
      c=col;
    }else{
      // светящиеся волоски по контуру
      halo=exp(-md*55.)*(.55+.45*n3(vec3(lp*30.,T*1.5)));
      c+=vec3(.6,1.,.85)*halo*.55;
    }
  }
  float hx=H*exp(-pow(length((uv-CAT-vec2(0.,.07))*vec2(1.,1.2))*7.,2.));
  c+=vec3(.6,1.,.85)*hx*.25*(.6+.4*sin(T*3.));
  c=mix(c,vec3(.93,1.,.96),smoothstep(.55,1.,Z));
  vec2 q=gl_FragCoord.xy/R;
  c*=.55+.45*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.18);
  c+=(h2(gl_FragCoord.xy+fract(T)*100.)-.5)*.035;
  c=pow(c,vec3(.95));
  gl_FragColor=vec4(c,1.);
}`;

export const CAT_POS = [0.0, -0.205];
export const CAT_SIZE = 0.15;

export function createScene(canvas, { scale = 0.8 } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); } catch (e) { console.warn(e); return null; }
  gl.linkProgram(pr);
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['R', 'T', 'M', 'Z', 'H'].map((k) => [k, gl.getUniformLocation(pr, k)]));
  const st = { zoom: 0, hover: 0, mouse: [0, 0], t0: performance.now(), raf: 0 };
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5) * scale;
    canvas.width = Math.round(canvas.clientWidth * d);
    canvas.height = Math.round(canvas.clientHeight * d);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const draw = (t) => {
    gl.uniform2f(U.R, canvas.width, canvas.height);
    gl.uniform1f(U.T, t);
    gl.uniform2f(U.M, st.mouse[0], st.mouse[1]);
    gl.uniform1f(U.Z, st.zoom);
    gl.uniform1f(U.H, st.hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  size();
  return {
    st, size, draw,
    start() { const loop = () => { draw((performance.now() - st.t0) / 1000); st.raf = requestAnimationFrame(loop); }; loop(); },
    stop() { cancelAnimationFrame(st.raf); },
    // Точка Кэша на экране в CSS-пикселях
    catPoint(dy = 0) { const r = canvas.getBoundingClientRect(); return [r.left + r.width / 2 + CAT_POS[0] * r.height, r.top + r.height / 2 - (CAT_POS[1] + dy) * r.height]; },
  };
}

// Один кадр сцены картинкой — для приглушённого фона сайта и баннера
export function snapshot(w = 1280, h = 720, t = 12) {
  try {
    const cached = sessionStorage.getItem('kSceneShot');
    if (cached) return cached;
  } catch { /* нет хранилища */ }
  const c = document.createElement('canvas');
  c.style.cssText = `position:fixed;left:-9999px;width:${w}px;height:${h}px`;
  document.body.appendChild(c);
  const s = createScene(c, { scale: 1 });
  let url = '';
  if (s) { s.draw(t); url = c.toDataURL('image/jpeg', 0.82); }
  c.remove();
  try { if (url) sessionStorage.setItem('kSceneShot', url); } catch { /* большой кадр */ }
  return url;
}
