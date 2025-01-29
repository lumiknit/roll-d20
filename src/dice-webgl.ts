import { mat4, vec3 } from 'gl-matrix';

// --- Shader & Program Helpers

/**
 * Create a shader.
 */
const newShader = (
	gl: WebGLRenderingContext,
	type: GLenum,
	source: string
): WebGLShader => {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error('Error creating shader');
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Error compiling shader: ${info}`);
	}

	return shader;
};

/**
 * Create a program.
 */
const newProgram = (
	gl: WebGLRenderingContext,
	vertex: WebGLShader,
	fragment: WebGLShader
): WebGLProgram => {
	const program = gl.createProgram();
	if (!program) {
		throw new Error('Error creating program');
	}

	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Error linking program: ${info}`);
	}

	return program;
};

// -- Shader codes

const shSrcVertDefault = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_tex_coord;

  uniform mat4 u_mv_matrix;
  uniform mat4 u_p_matrix;
  uniform mat4 u_normal_matrix;

  uniform vec3 u_light_dir;
  uniform vec3 u_light_color;

  varying vec3 v_normal;
  varying vec3 v_light_dir;
  varying vec3 v_light_color;
  varying vec2 v_tex_coord;

  void main() {
    gl_Position = u_p_matrix * u_mv_matrix * vec4(a_position, 1.0);
	v_normal = normalize(u_normal_matrix * vec4(a_normal, 1.0)).xyz;
	v_light_dir = normalize(u_light_dir);
	v_light_color = u_light_color;
	v_tex_coord = a_tex_coord;
  }
`;

const shSrcFragDefault = `
  precision mediump float;

  varying vec3 v_normal;
  varying vec3 v_light_dir;
  varying vec3 v_light_color;
  varying vec2 v_tex_coord;

  uniform vec4 u_color;
  uniform sampler2D u_texture;

  void main() {
    vec3 normal = normalize(v_normal);
	float diff = max(dot(normal, v_light_dir), 0.3);

	vec3 color = texture2D(u_texture, v_tex_coord).rgb;
	color = color * v_light_color * diff;
	color = clamp(color, 0.0, 1.0);

	gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Textures

type NumberTexture = {
	texture: WebGLTexture;
	count: number;
};

const createNumberTexture = (gl: WebGLRenderingContext): NumberTexture => {
	const size = 1024;
	const cellCount = 8;
	const cellSize = size / cellCount;
	// Create a number from 1 to 20
	const oc = new OffscreenCanvas(size, size);
	if (!oc) {
		throw new Error('Error creating OffscreenCanvas');
	}
	const ctx = oc.getContext('2d');
	if (!ctx) {
		throw new Error('Error creating 2d context');
	}

	ctx.fillStyle = '#403070';
	ctx.fillRect(0, 0, size, size);

	ctx.fillStyle = '#e4e0d0';
	ctx.font = `${cellSize / 2.5}px 'MaruBuri', serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	for (let v = 1; v <= cellCount * cellCount; v++) {
		let text = v.toString();
		if (v === 6 || v === 9) {
			text += '.';
		}
		const xc = (v - 1) % cellCount;
		const yc = Math.floor((v - 1) / cellCount);
		ctx.fillText(
			text,
			xc * cellSize + cellSize / 2,
			yc * cellSize + cellSize / 2
		);
	}

	const texture = gl.createTexture();
	if (!texture) {
		throw new Error('Error creating texture');
	}
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, oc);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

	return {
		texture,
		count: cellCount,
	};
};

// --- Buffers

type ObjectBuffers = {
	size: number;
	vert: WebGLBuffer;
	norm: WebGLBuffer;
	tex: WebGLBuffer;

	faceNormals?: vec3[];
};

const newObjectBuffers = (
	gl: WebGLRenderingContext,
	vertices: Float32Array, // 3D vertices
	normals: Float32Array, // 3D normals
	texs: Float32Array // 2D texture coordinates
): ObjectBuffers => {
	const vertBuf = gl.createBuffer();
	if (!vertBuf) {
		throw new Error('Error creating buffer');
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	const normBuf = gl.createBuffer();
	if (!normBuf) {
		throw new Error('Error creating buffer');
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
	gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

	const texBuf = gl.createBuffer();
	if (!texBuf) {
		throw new Error('Error creating buffer');
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
	gl.bufferData(gl.ARRAY_BUFFER, texs, gl.STATIC_DRAW);

	return {
		size: vertices.length / 3,
		vert: vertBuf,
		norm: normBuf,
		tex: texBuf,
	};
};

const bindObjectBuffersAttribute = (
	gl: WebGLRenderingContext,
	buffers: ObjectBuffers,
	program: WebGLProgram
): void => {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vert);
	const position = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.norm);
	const normal = gl.getAttribLocation(program, 'a_normal');
	gl.enableVertexAttribArray(normal);
	gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tex);
	const tex = gl.getAttribLocation(program, 'a_tex_coord');
	gl.enableVertexAttribArray(tex);
	gl.vertexAttribPointer(tex, 2, gl.FLOAT, false, 0, 0);
};

const squareObjectBuffers = (gl: WebGLRenderingContext): ObjectBuffers => {
	return newObjectBuffers(
		gl,
		new Float32Array([
			-1, -1, 0, 1, -1, 0, 1, 1, 0,

			-1, -1, 0, 1, 1, 0, -1, 1, 0,
		]),
		new Float32Array([
			0, 0, 1, 0, 0, 1, 0, 0, 1,

			0, 0, 1, 0, 0, 1, 0, 0, 1,
		]),
		new Float32Array([
			0, 0, 1, 0, 1, 1,

			0, 0, 1, 1, 0, 1,
		])
	);
};

const faceNormal = (p0: number[], p1: number[], p2: number[]): number[] => {
	const v0 = vec3.fromValues(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
	const v1 = vec3.fromValues(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
	const n = vec3.create();
	vec3.cross(n, v0, v1);
	vec3.normalize(n, n);
	return [n[0], n[1], n[2]];
};

const icosahedronObjectBuffers = (gl: WebGLRenderingContext): ObjectBuffers => {
	const PHI = (1 + Math.sqrt(5)) / 2;
	const NORM = Math.sqrt(1 + PHI * PHI);

	const rawVertices = [
		[-1, PHI, 0],
		[1, PHI, 0],
		[-1, -PHI, 0],
		[1, -PHI, 0],
		[0, -1, PHI],
		[0, 1, PHI],
		[0, -1, -PHI],
		[0, 1, -PHI],
		[PHI, 0, -1],
		[PHI, 0, 1],
		[-PHI, 0, -1],
		[-PHI, 0, 1],
	].map((v) => v.map((n) => n / NORM)); // 정규화

	const triangles = [
		[0, 11, 5],
		[3, 2, 6],
		[0, 1, 7],
		[3, 9, 4],
		[0, 10, 11],

		[6, 2, 10],
		[5, 11, 4],
		[9, 8, 1],
		[10, 7, 6],
		[2, 4, 11],

		[7, 1, 8],
		[4, 9, 5],
		[11, 10, 2],
		[8, 6, 7],
		[1, 5, 9],

		[3, 8, 9],
		[0, 7, 10],
		[3, 4, 2],
		[0, 5, 1],
		[3, 6, 8],
	];

	const vertices: number[] = [];
	const normals: number[] = [];
	const texs: number[] = [];

	const faceNormals: vec3[] = [];

	let faceNum = 0;

	for (const [a, b, c] of triangles) {
		const v0 = rawVertices[a];
		const v1 = rawVertices[b];
		const v2 = rawVertices[c];

		vertices.push(...v0, ...v1, ...v2);

		const n = faceNormal(v0, v1, v2);
		normals.push(...n, ...n, ...n);

		faceNormals.push(vec3.fromValues(n[0], n[1], n[2]));

		// Texture
		const s = 1.0 / 8;
		const x = (faceNum % 8) * s;
		const y = Math.floor(faceNum / 8) * s;
		texs.push(x, y + s, x + s, y + s, x + s / 2, y);
		faceNum++;

		console.log(faceNum, n);
	}
	console.log(vertices.length, normals.length);

	const buf = newObjectBuffers(
		gl,
		new Float32Array(vertices),
		new Float32Array(normals),
		new Float32Array(texs)
	);
	buf.faceNormals = faceNormals;
	return buf;
};

/**
 * Graphic context.
 */
export type GContext = {
	gl: WebGLRenderingContext;

	// Programs
	pDefault: WebGLProgram;

	// Texture
	texNumbers: NumberTexture;

	// Square
	sq: ObjectBuffers;
	icosahedron: ObjectBuffers;
};

/**
 * Create a WebGL context.
 */
export const newGContext = (canvas: HTMLCanvasElement): GContext => {
	const gl = canvas.getContext('webgl') as WebGLRenderingContext;
	if (!gl) {
		throw new Error('WebGL not supported');
	}

	// Square with Normal
	const sq = squareObjectBuffers(gl);
	const icosahedron = icosahedronObjectBuffers(gl);

	// Create default program
	const pDefault = newProgram(
		gl,
		newShader(gl, gl.VERTEX_SHADER, shSrcVertDefault),
		newShader(gl, gl.FRAGMENT_SHADER, shSrcFragDefault)
	);

	return {
		gl,
		texNumbers: createNumberTexture(gl),
		sq,
		icosahedron,
		pDefault,
	};
};

/**
 * Clear the screen
 */
export const clear = (g: GContext): void => {
	const { gl } = g;
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
};

/**
 * Draw scene
 */
export const drawScene = (g: GContext, mvMat: mat4, dist: vec3): void => {
	clear(g);

	const { gl } = g;

	const pMatrix = mat4.perspective(
		mat4.create(),
		45,
		g.gl.canvas.width / g.gl.canvas.height,
		0.1,
		100
	);
	const mvMatrix = mat4.create();
	mat4.translate(mvMatrix, mvMatrix, [dist[0], dist[1], -2.5 + dist[2]]);
	mat4.multiply(mvMatrix, mvMatrix, mvMat);

	gl.useProgram(g.pDefault);

	/*
	const faceNormal = g.icosahedron.faceNormals![num - 1];
	// Find how to rotate the dice to show the number
	const axis = vec3.create();
	vec3.cross(axis, faceNormal, [0, 0, 1]);
	const angleRad = Math.acos(vec3.dot(faceNormal, [0, 0, 1]));
	mat4.rotate(mvMatrix, mvMatrix, angleRad, axis);
	*/

	bindObjectBuffersAttribute(gl, g.icosahedron, g.pDefault);

	const pMatrixLoc = gl.getUniformLocation(g.pDefault, 'u_p_matrix');
	gl.uniformMatrix4fv(pMatrixLoc, false, pMatrix);

	const mvMatrixLoc = gl.getUniformLocation(g.pDefault, 'u_mv_matrix');
	gl.uniformMatrix4fv(mvMatrixLoc, false, mvMatrix);

	const normalMatrix = mat4.create();
	mat4.invert(normalMatrix, mvMatrix);
	mat4.transpose(normalMatrix, normalMatrix);
	const normalMatrixLoc = gl.getUniformLocation(
		g.pDefault,
		'u_normal_matrix'
	);
	gl.uniformMatrix4fv(normalMatrixLoc, false, normalMatrix);

	const colorLoc = gl.getUniformLocation(g.pDefault, 'u_color');
	gl.uniform4fv(colorLoc, [1, 1, 1, 1]);

	const lightDir = [0, 0, 1];
	const lightDirLoc = gl.getUniformLocation(g.pDefault, 'u_light_dir');
	gl.uniform3fv(lightDirLoc, lightDir);

	const lightColor = [1, 1, 1];
	const lightColorLoc = gl.getUniformLocation(g.pDefault, 'u_light_color');
	gl.uniform3fv(lightColorLoc, lightColor);

	const texLoc = gl.getUniformLocation(g.pDefault, 'u_texture');
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, g.texNumbers.texture);
	gl.uniform1i(texLoc, 0);

	gl.drawArrays(gl.TRIANGLES, 0, g.icosahedron.size);
};

export const findFrontFace = (g: GContext, mvMat: mat4): number => {
	// Find front number from the model matrix
	const front = vec3.fromValues(0, 0, 1);
	// Rotate the front vector by the model matrix
	const rotated = vec3.create();
	const inv = mat4.create();
	mat4.invert(inv, mvMat);
	vec3.transformMat4(rotated, front, inv);
	// Find the closest face normal
	let maxCos = -1;
	let maxIndex = -1;
	for (let i = 0; i < 20; i++) {
		const cos = vec3.dot(rotated, g.icosahedron.faceNormals![i]);
		if (cos > maxCos) {
			maxCos = cos;
			maxIndex = i;
		}
	}
	return maxIndex + 1;
};

export const rotateToNearestFace = (
	g: GContext,
	mvMat: mat4,
	factor: number,
	n?: number
): mat4 => {
	// Find front number from the model matrix
	const front = vec3.fromValues(0, 0, 1);
	// Rotate the front vector by the model matrix
	const rotated = vec3.create();
	const inv = mat4.create();
	mat4.invert(inv, mvMat);
	vec3.transformMat4(rotated, front, inv);

	let maxCos = -1;
	let maxIndex = -1;

	if (n !== undefined) {
		maxIndex = n - 1;
		maxCos = vec3.dot(front, g.icosahedron.faceNormals![maxIndex]);
		console.log(maxIndex, maxCos);
	} else {
		// Find the closest face normal

		for (let i = 0; i < 20; i++) {
			const cos = vec3.dot(rotated, g.icosahedron.faceNormals![i]);
			if (cos > maxCos) {
				maxCos = cos;
				maxIndex = i;
			}
		}
	}

	if (maxCos > 0.999) return mvMat;

	// Find correct normal
	const target = g.icosahedron.faceNormals![maxIndex];
	const axis = vec3.create();
	vec3.cross(axis, target, rotated);
	const angleRad = Math.acos(vec3.dot(target, rotated));
	mat4.rotate(mvMat, mvMat, angleRad * factor, axis);

	return mvMat;
};
