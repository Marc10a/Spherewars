"use client";

import { useEffect, useRef } from "react";
import type { Element } from "@/lib/element";

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

// Domain-warped noise, with one look per god's element. Output is meant for mix-blend-mode: screen.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform int k;
out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(11.3,7.1); a*=.5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / r; vec2 q = uv * vec2(r.x/r.y, 1.);
  float d = 1. - smoothstep(0., .65, length(uv - m));
  vec3 c = vec3(0.);
  if (k == 0) {            // Kazag: heat rising from below
    vec2 w = q * 3.2 + vec2(fbm(q*2.+t*.15)*1.3, -t*.55);
    float f = fbm(w + fbm(w + t*.2)); f = pow(smoothstep(.42, .95, f + (1.-uv.y)*.34 - .14), 1.5);
    c = mix(vec3(.75,.1,.02), vec3(1.,.72,.25), f) * f * (1. - uv.y*.72) * (1.05 + d*.5);
  } else if (k == 1) {     // Kurgan: freezing mist and frost at the edges
    vec2 w = q * 2.4 + vec2(t*.09, -t*.03);
    float f = fbm(w + fbm(w*1.6 - t*.06)*1.5);
    float edge = smoothstep(.34, .0, min(min(uv.x,1.-uv.x), min(uv.y,1.-uv.y)));
    float frost = smoothstep(.5, .85, fbm(q*11.)) * edge;
    c = vec3(.55,.8,1.) * (smoothstep(.38,.9,f)*.42*(.6+d*.6) + frost*.75);
  } else if (k == 2) {     // Malesur: streams of wind
    vec2 s = vec2(q.x*1.1 - t*.42, q.y*5.5 + fbm(q*1.6+t*.12)*2.6);
    float f = fbm(s); f = pow(smoothstep(.48,.86,f), 2.4);
    c = mix(vec3(.3,.75,.42), vec3(.86,1.,.8), f) * f * (.72 + d*.5);
  } else {                 // Alliance: gold light through banners and dust
    vec2 w = q*2.6 + vec2(-t*.08, t*.03);
    float f = fbm(w + fbm(w*1.4 + t*.05));
    float ray = pow(max(0., sin((uv.x - uv.y*.45)*11. + fbm(q*2.+t*.1)*2.5)), 9.) * (1.-uv.y)*.55;
    c = vec3(1.,.76,.38) * (smoothstep(.42,.9,f)*.36*(.6+d*.6) + ray);
  }
  o = vec4(c, 1.);
}`;
const KIND: Record<Element, number> = { fire: 0, ice: 1, wind: 2, forge: 3 };

/** Live WebGL2 layer over the faction video; follows the mouse. Stops off screen; absent without WebGL or with reduced motion. */
export function ElementShader({ element }: { element: Element }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ur = gl.getUniformLocation(prog, "r"), ut = gl.getUniformLocation(prog, "t"), um = gl.getUniformLocation(prog, "m");
    gl.uniform1i(gl.getUniformLocation(prog, "k"), KIND[element]);

    let raf = 0, visible = true, tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5;
    const size = () => {
      const b = cv.getBoundingClientRect(), s = 0.5; // half resolution: the look is soft and it spares the GPU
      cv.width = Math.max(1, b.width * s); cv.height = Math.max(1, b.height * s);
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(ur, cv.width, cv.height);
    };
    const frame = (now: number) => {
      raf = 0;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      gl.uniform1f(ut, now / 1000); gl.uniform2f(um, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const onMove = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect();
      tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height;
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }); io.observe(cv);
    document.addEventListener("visibilitychange", start);
    window.addEventListener("pointermove", onMove, { passive: true });
    start();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", start); window.removeEventListener("pointermove", onMove);
    };
  }, [element]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-90 mix-blend-screen" />;
}
