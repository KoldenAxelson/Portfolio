// The thin WebGL layer the solver sits on: compile a program, make a render
// target, draw a full-screen quad into it.

export interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface Fbo {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
  attach: (unit: number) => number;
  destroy: () => void;
}

export interface DoubleFbo {
  read: Fbo;
  write: Fbo;
  swap: () => void;
  destroy: () => void;
}

export interface Renderer {
  link: (vertex: string, fragment: string) => Program | null;
  createFbo: (width: number, height: number, internal: number, format: number, type?: number) => Fbo;
  createDoubleFbo: (width: number, height: number, internal: number, format: number) => DoubleFbo;
  // Draw the quad into a target, or into the canvas when handed null.
  blit: (target: Fbo | null) => void;
  use: (program: Program, texelSource?: Fbo) => Program;
  destroy: () => void;
}

export function createRenderer(gl: WebGL2RenderingContext): Renderer {
  // Linear filtering on float targets is an extension. Without it the solver
  // still runs, it just samples its own fields at point resolution.
  const filter = gl.getExtension('OES_texture_float_linear') ? gl.LINEAR : gl.NEAREST;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const createFbo = (
    width: number,
    height: number,
    internal: number,
    format: number,
    type: number = gl.HALF_FLOAT,
  ): Fbo => {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null);

    const framebuffer = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      framebuffer,
      width,
      height,
      texelX: 1 / width,
      texelY: 1 / height,
      attach(unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return unit;
      },
      destroy() {
        gl.deleteFramebuffer(framebuffer);
        gl.deleteTexture(texture);
      },
    };
  };

  const createDoubleFbo = (
    width: number,
    height: number,
    internal: number,
    format: number,
  ): DoubleFbo => {
    let front = createFbo(width, height, internal, format);
    let back = createFbo(width, height, internal, format);
    return {
      get read() {
        return front;
      },
      get write() {
        return back;
      },
      swap() {
        const held = front;
        front = back;
        back = held;
      },
      destroy() {
        front.destroy();
        back.destroy();
      },
    };
  };

  return {
    link: (vertex, fragment) => link(gl, vertex, fragment),
    createFbo,
    createDoubleFbo,
    blit(target) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    },
    // Nearly every pass wants texelSize for the vertex shader's neighbour
    // offsets, so it comes along with the program switch rather than being one
    // more line to forget at each call site.
    use(program, texelSource) {
      gl.useProgram(program.program);
      if (texelSource) {
        gl.uniform2f(program.uniforms.texelSize, texelSource.texelX, texelSource.texelY);
      }
      return program;
    },
    destroy() {
      gl.deleteBuffer(quad);
      gl.deleteBuffer(indices);
    },
  };
}

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}
