"use client";

import { useEffect, useRef } from "react";

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FRAG = `#version 300 es
precision highp float;
uniform vec2 r; uniform float t; uniform float g;
out vec4 o;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.02+7.1; a*=.5; } return s; }
void main(){
  vec2 q = (gl_FragCoord.xy - .5*r) / min(r.x,r.y);
  float R = .17 + .17*g, d = length(q);
  vec3 c = vec3(0.);
  if (d < R) {
    float z = sqrt(R*R - d*d); vec3 P = vec3(q, z) / R;
    float a = t*.12; P.xz = mat2(cos(a),-sin(a),sin(a),cos(a)) * P.xz;
    vec3 w = P*2.6 + vec3(0.,t*.08,0.);
    float f = fbm(w + 1.6*fbm(w*1.4 - t*.1));
    float crack = pow(1. - abs(2.*f - 1.), 7.);
    vec3 rock = vec3(.07,.03,.02) + vec3(.34,.1,.03)*smoothstep(.35,.75,f);
    c = rock + vec3(1.,.5,.1)*crack*1.8 + vec3(1.,.84,.42)*pow(crack,3.)*1.6;
    float limb = 1. - z/R;
    c += vec3(1.,.42,.08)*pow(limb,2.2)*1.5;
  }
  float e = max(d - R, 0.);
  float ang = atan(q.y,q.x);
  float rays = fbm(vec3(cos(ang)*2.6, sin(ang)*2.6, t*.22)) ;
  float cor = exp(-e*(13.-5.*g)/(.55+rays)) * (d>=R ? 1. : .15);
  c += mix(vec3(.85,.16,.03), vec3(1.,.66,.22), exp(-e*16.)) * cor * (.72+.5*g);
  o = vec4(c*(.82-.34*g), 1.);
}`;

/** The burning Sphere, drawn live: it grows as the visitor scrolls. Without WebGL or with reduced motion, the dark page shows behind the text. */
export function EssenceOrb() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    const sh = (ty: number, s: string) => { const x = gl.createShader(ty)!; gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const l = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    const ur = gl.getUniformLocation(pr, "r"), ut = gl.getUniformLocation(pr, "t"), ug = gl.getUniformLocation(pr, "g");
    const host = cv.parentElement!.parentElement!;
    let raf = 0, visible = true, grow = 0;
    const size = () => {
      const b = cv.getBoundingClientRect(), s = Math.min(window.devicePixelRatio || 1, 1) * 0.75;
      cv.width = Math.max(1, b.width * s); cv.height = Math.max(1, b.height * s);
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(ur, cv.width, cv.height);
    };
    const frame = (now: number) => {
      raf = 0;
      const b = host.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -b.top / Math.max(1, b.height - window.innerHeight)));
      grow += (p - grow) * 0.08;
      gl.uniform1f(ut, now / 1000); gl.uniform1f(ug, grow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }); io.observe(cv);
    document.addEventListener("visibilitychange", start);
    start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", start); };
  }, []);

  return <canvas ref={ref} aria-hidden className="h-full w-full" />;
}
